import * as THREE from 'three';

import type { ResponsiveConfig } from '../../app/responsiveConfig';

const ROPE_POINTS = 10;
const CONSTRAINT_ITERATIONS = 8;
const CARD_DEPTH = 14;
const CARD_WIDTH = 1.85;
const CARD_HEIGHT = 2.6;
const BAND_WIDTH = 0.13;
// Querschnitt des Bandes: aussen Neonkante, innen dunkler Kern.
const BAND_COLUMNS = [-0.5, -0.34, 0.34, 0.5];
const BAND_EDGE_COLOR = new THREE.Color('#e8edf2');
const BAND_CORE_COLOR = new THREE.Color('#1a1e24');
const GRAVITY = -26;
const DAMPING = 0.985;
// ponytail: konstante Brise statt Turbulenzmodell; Wert ist der Regler dafuer.
const WIND_STRENGTH = 3.4;
// Mobil haengt eine Miniaturkarte neben dem INTRO-Menuepunkt: Seil 1 cm, Karte 1.5 cm.
const MOBILE_ROPE_CM = 1;
const MOBILE_CARD_CM = 1.5;
const CSS_PX_PER_CM = 96 / 2.54;
const DESKTOP_ROPE_FACTOR = 0.46;
const CARD_IMAGE_URL = 'https://res.cloudinary.com/ixyonosn/image/upload/v1786943873/Gemini_Generated_Image_sjtag6sjtag6sjta.jpg';
const CARD_TEXTURE_WIDTH = 512;
const CARD_TEXTURE_HEIGHT = 744;

type RopePoint = {
    position: THREE.Vector3;
    previous: THREE.Vector3;
    pinned: boolean;
};

/**
 * A camera-space lanyard: a verlet rope pinned to the top of the viewport with
 * an ID card swinging from its end. Ported from the React Bits component so the
 * portfolio keeps a single WebGL context instead of mounting a React island.
 */
export class LanyardSystem {
    private readonly group = new THREE.Group();
    private readonly camera: THREE.PerspectiveCamera;
    private readonly canvas: HTMLCanvasElement;
    private readonly points: RopePoint[] = [];
    private readonly band: THREE.Mesh;
    private readonly bandGeometry = new THREE.BufferGeometry();
    private readonly card: THREE.Mesh;
    private readonly clip: THREE.Group;
    private readonly pointer = new THREE.Vector2();
    private readonly raycaster = new THREE.Raycaster();
    private readonly dragPlane = new THREE.Plane();
    private readonly dragOffset = new THREE.Vector3();
    private readonly hit = new THREE.Vector3();
    private segmentLength = 0.55;
    private reducedMotion: boolean;
    private allowDrag: boolean;
    private dragging = false;
    private dragPointerId: number | undefined;
    private torsion = 0;
    private torsionVelocity = 0;
    private windTime = Math.random() * 40;
    private isMobile: boolean;
    private cardScale = 1;
    private bandWidth = BAND_WIDTH;
    private anchorX = 0;
    private introRect: DOMRect | undefined;
    private introRectAge = 0;

    constructor(
        scene: THREE.Scene,
        camera: THREE.PerspectiveCamera,
        canvas: HTMLCanvasElement,
        responsiveConfig: ResponsiveConfig,
    ) {
        this.camera = camera;
        this.canvas = canvas;
        this.reducedMotion = responsiveConfig.reducedMotion;
        this.allowDrag = true;
        this.isMobile = responsiveConfig.isMobile;

        this.group.name = 'Lanyard';
        this.group.renderOrder = 120;
        scene.add(this.group);

        for (let index = 0; index < ROPE_POINTS; index += 1) {
            const position = new THREE.Vector3(0, -index * this.segmentLength, -CARD_DEPTH);
            this.points.push({
                position,
                previous: position.clone(),
                pinned: index === 0,
            });
        }

        const bandVertices = ROPE_POINTS * BAND_COLUMNS.length;
        this.bandGeometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(bandVertices * 3), 3),
        );
        this.bandGeometry.setAttribute(
            'color',
            new THREE.BufferAttribute(createRibbonColors(ROPE_POINTS), 3),
        );
        this.bandGeometry.setIndex(createRibbonIndices(ROPE_POINTS));

        this.band = new THREE.Mesh(
            this.bandGeometry,
            new THREE.MeshBasicMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.95,
                toneMapped: false,
                depthWrite: false,
            }),
        );
        this.band.frustumCulled = false;
        this.group.add(this.band);

        this.clip = createClip();
        this.group.add(this.clip);

        const cardCanvas = createCardTexture();
        const cardTexture = new THREE.CanvasTexture(cardCanvas);
        cardTexture.colorSpace = THREE.SRGBColorSpace;
        cardTexture.anisotropy = 8;
        paintCardImage(cardCanvas, cardTexture);
        this.card = new THREE.Mesh(createCardGeometry(), [
            new THREE.MeshBasicMaterial({ map: cardTexture, toneMapped: false }),
            new THREE.MeshBasicMaterial({ color: new THREE.Color('#c2ccd4'), toneMapped: false }),
        ]);
        this.card.frustumCulled = false;
        this.group.add(this.card);

        // Das Canvas ist pointer-events:none, darum hängt der Griff am Fenster.
        window.addEventListener('pointerdown', this.handlePointerDown);
        window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
        window.addEventListener('pointerup', this.handlePointerUp);
        window.addEventListener('pointercancel', this.handlePointerUp);
    }

    public setResponsiveConfig(config: ResponsiveConfig): void {
        this.reducedMotion = config.reducedMotion;
        this.isMobile = config.isMobile;
    }

    public setVisible(visible: boolean): void {
        this.group.visible = visible;
    }

    public update(delta: number): void {
        this.group.position.copy(this.camera.position);
        this.group.quaternion.copy(this.camera.quaternion);

        if (!this.group.visible) {
            return;
        }

        const halfHeight =
            Math.tan(THREE.MathUtils.degToRad(this.camera.fov) * 0.5) * CARD_DEPTH;
        const { anchorX, anchorY, ropeLength, cardScale, bandWidth } = this.getLayout(halfHeight);
        const segmentLength = ropeLength / (ROPE_POINTS - 1);
        const anchor = this.points[0];

        this.cardScale = cardScale;
        this.bandWidth = bandWidth;
        this.card.scale.setScalar(cardScale);
        this.clip.scale.setScalar(cardScale);

        // Springt der Anker (erster Frame, Resize, FOV-Fahrt), hängt das Seil sonst als
        // gefaltete Kette fest: rein senkrechte Falten sind ein stabiles Gleichgewicht.
        if (
            Math.abs(segmentLength - this.segmentLength) > 0.01 ||
            Math.abs(anchorY - anchor.position.y) > 0.01 ||
            Math.abs(anchorX - this.anchorX) > 0.01
        ) {
            this.segmentLength = segmentLength;
            this.anchorX = anchorX;
            this.resetRope(anchorY);
        }

        anchor.position.set(anchorX, anchorY, -CARD_DEPTH);
        anchor.previous.copy(anchor.position);

        const step = Math.min(delta, 1 / 30);
        this.integrate(step);
        for (let iteration = 0; iteration < CONSTRAINT_ITERATIONS; iteration += 1) {
            this.solveConstraints();
        }

        this.updateBandGeometry();
        this.updateCard(step);
    }

    public dispose(): void {
        window.removeEventListener('pointerdown', this.handlePointerDown);
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        window.removeEventListener('pointercancel', this.handlePointerUp);
        window.removeEventListener('touchmove', this.blockTouchScroll);
        this.group.removeFromParent();
        this.bandGeometry.dispose();
        this.card.geometry.dispose();
        (Array.isArray(this.card.material) ? this.card.material : [this.card.material]).forEach(
            (material) => material.dispose(),
        );
        (this.band.material as THREE.Material).dispose();
    }

    /**
     * Desktop: grosse Karte mittig unter der Oberkante. Mobil: Miniatur neben dem
     * INTRO-Menuepunkt, in Zentimetern bemessen statt in Weltkoordinaten.
     */
    private getLayout(halfHeight: number): {
        anchorX: number;
        anchorY: number;
        ropeLength: number;
        cardScale: number;
        bandWidth: number;
    } {
        if (!this.isMobile) {
            return {
                anchorX: 0,
                anchorY: halfHeight * 0.98,
                ropeLength: halfHeight * DESKTOP_ROPE_FACTOR,
                cardScale: 1,
                bandWidth: BAND_WIDTH,
            };
        }

        const worldPerPixel = (halfHeight * 2) / Math.max(1, window.innerHeight);
        const cardScale = (MOBILE_CARD_CM * CSS_PX_PER_CM * worldPerPixel) / CARD_HEIGHT;
        const anchorRect = this.getIntroLinkRect();
        const halfWidth = halfHeight * this.camera.aspect;
        const anchorX = anchorRect
            ? ((anchorRect.right + 10) / window.innerWidth) * 2 * halfWidth - halfWidth
            : -halfWidth * 0.55;
        const anchorY = anchorRect
            ? halfHeight - (anchorRect.bottom / window.innerHeight) * 2 * halfHeight
            : halfHeight * 0.9;

        return {
            anchorX,
            anchorY,
            ropeLength: MOBILE_ROPE_CM * CSS_PX_PER_CM * worldPerPixel,
            cardScale,
            bandWidth: BAND_WIDTH * cardScale,
        };
    }

    /** Position des INTRO-Links; nur alle paar Frames gemessen, Layout-Reads sind teuer. */
    private getIntroLinkRect(): DOMRect | undefined {
        this.introRectAge += 1;
        if (this.introRect && this.introRectAge < 30) {
            return this.introRect;
        }

        this.introRectAge = 0;
        const link = document.querySelector('.nav__link[data-scroll="#intro"]');
        this.introRect = link instanceof Element ? link.getBoundingClientRect() : undefined;

        return this.introRect;
    }

    /** Hängt das Seil gerade unter den Anker; die winzige Neigung verhindert Faltungen. */
    private resetRope(anchorY: number): void {
        for (let index = 0; index < this.points.length; index += 1) {
            const point = this.points[index];
            point.position.set(
                this.anchorX + index * 0.01,
                anchorY - index * this.segmentLength,
                -CARD_DEPTH,
            );
            point.previous.copy(point.position);
        }
    }

    private integrate(delta: number): void {
        const gravity = this.reducedMotion ? GRAVITY * 0.35 : GRAVITY;
        this.windTime += delta;

        // Zwei ungleiche Schwingungen ergeben eine Brise ohne erkennbare Schleife.
        const wind = this.reducedMotion
            ? 0
            : (Math.sin(this.windTime * 0.62) + Math.sin(this.windTime * 1.43 + 1.1) * 0.45) *
              WIND_STRENGTH *
              (this.isMobile ? 0.5 : 1);

        for (let index = 0; index < this.points.length; index += 1) {
            const point = this.points[index];
            if (point.pinned) {
                continue;
            }

            // Weiter unten am Band greift der Wind stärker an.
            const gust = wind * (index / (this.points.length - 1));
            const velocityX = (point.position.x - point.previous.x) * DAMPING;
            const velocityY = (point.position.y - point.previous.y) * DAMPING;
            const velocityZ = (point.position.z - point.previous.z) * DAMPING;
            point.previous.copy(point.position);
            point.position.x += velocityX + gust * delta * delta;
            point.position.y += velocityY + gravity * delta * delta;
            point.position.z += velocityZ;
        }

        if (this.dragging) {
            const tail = this.points[this.points.length - 1];
            tail.position.copy(this.hit).sub(this.dragOffset);
        }
    }

    private solveConstraints(): void {
        for (let index = 0; index < this.points.length - 1; index += 1) {
            const current = this.points[index];
            const next = this.points[index + 1];
            const delta = next.position.clone().sub(current.position);
            const distance = delta.length() || 0.0001;
            const difference = (distance - this.segmentLength) / distance;
            const correction = delta.multiplyScalar(difference * 0.5);
            const tailPinned = this.dragging && index + 1 === this.points.length - 1;

            if (!current.pinned) {
                current.position.add(correction);
            }
            if (!tailPinned) {
                next.position.sub(correction);
            }
        }
    }

    private updateBandGeometry(): void {
        const positions = this.bandGeometry.getAttribute('position') as THREE.BufferAttribute;
        const direction = new THREE.Vector3();
        const side = new THREE.Vector3();
        const view = new THREE.Vector3(0, 0, 1);
        const columns = BAND_COLUMNS.length;

        for (let index = 0; index < this.points.length; index += 1) {
            const point = this.points[index].position;
            const neighbour = this.points[Math.min(index + 1, this.points.length - 1)].position;
            const previous = this.points[Math.max(index - 1, 0)].position;
            direction.copy(neighbour).sub(previous);
            if (direction.lengthSq() < 1e-6) {
                direction.set(0, -1, 0);
            }
            side.crossVectors(direction, view).normalize().multiplyScalar(this.bandWidth);

            for (let column = 0; column < columns; column += 1) {
                const offset = BAND_COLUMNS[column];
                positions.setXYZ(
                    index * columns + column,
                    point.x + side.x * offset,
                    point.y + side.y * offset,
                    point.z + side.z * offset,
                );
            }
        }

        positions.needsUpdate = true;
        this.bandGeometry.computeBoundingSphere();
    }

    private updateCard(delta: number): void {
        const tail = this.points[this.points.length - 1];
        const previous = this.points[this.points.length - 2];
        const direction = tail.position.clone().sub(previous.position);
        if (direction.lengthSq() < 1e-6) {
            direction.set(0, -1, 0);
        }
        direction.normalize();

        // Clip am Bandende, Karte darunter — beides folgt der Bandrichtung.
        this.clip.position.copy(tail.position);
        this.clip.rotation.set(0, 0, Math.atan2(direction.x, -direction.y));
        this.card.position
            .copy(tail.position)
            .addScaledVector(direction, (CARD_HEIGHT * 0.5 + 0.52) * this.cardScale);

        const lateralVelocity = tail.position.x - tail.previous.x;
        // Eigenständige Drehung um die Hochachse, damit die Karte sich zeigt und zurückschwingt.
        this.torsionVelocity += (lateralVelocity * 90 - this.torsion * 14) * delta;
        this.torsionVelocity *= this.reducedMotion ? 0.86 : 0.975;
        this.torsion += this.torsionVelocity * delta;

        // Die Gruppe liegt bereits in der Kameraebene: Neigung entlang des Bandes reicht.
        this.card.rotation.set(0, this.torsion, Math.atan2(direction.x, -direction.y));
    }

    private readonly handlePointerDown = (event: PointerEvent): void => {
        if (!this.allowDrag || !this.group.visible) {
            return;
        }

        // Klicks auf echte Bedienelemente gehören der Seite, nicht der Karte.
        if (event.target instanceof Element && event.target.closest('a, button, input, textarea')) {
            return;
        }

        this.updatePointer(event);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const [intersection] = this.raycaster.intersectObject(this.card, false);
        if (!intersection) {
            return;
        }

        this.dragging = true;
        this.dragPointerId = event.pointerId;
        this.dragPlane.setFromNormalAndCoplanarPoint(
            this.camera.getWorldDirection(new THREE.Vector3()).negate(),
            intersection.point,
        );
        this.group.worldToLocal(this.hit.copy(intersection.point));
        this.dragOffset.copy(this.hit).sub(this.points[this.points.length - 1].position);
        document.body.style.cursor = 'grabbing';
        // Solange der Finger die Karte haelt, darf die Seite nicht mitscrollen.
        window.addEventListener('touchmove', this.blockTouchScroll, { passive: false });
    };

    private readonly handlePointerMove = (event: PointerEvent): void => {
        if (!this.dragging || event.pointerId !== this.dragPointerId) {
            return;
        }

        this.updatePointer(event);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const worldHit = new THREE.Vector3();
        if (!this.raycaster.ray.intersectPlane(this.dragPlane, worldHit)) {
            return;
        }
        this.group.worldToLocal(this.hit.copy(worldHit));
    };

    private readonly handlePointerUp = (event: PointerEvent): void => {
        if (!this.dragging || event.pointerId !== this.dragPointerId) {
            return;
        }

        this.dragging = false;
        this.dragPointerId = undefined;
        document.body.style.cursor = '';
        window.removeEventListener('touchmove', this.blockTouchScroll);
    };

    private readonly blockTouchScroll = (event: TouchEvent): void => {
        if (this.dragging && event.cancelable) {
            event.preventDefault();
        }
    };

    private updatePointer(event: PointerEvent): void {
        const bounds = this.canvas.getBoundingClientRect();
        this.pointer.set(
            ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
            -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
    }
}

const createRibbonIndices = (pointCount: number): number[] => {
    const columns = BAND_COLUMNS.length;
    const indices: number[] = [];
    for (let index = 0; index < pointCount - 1; index += 1) {
        for (let column = 0; column < columns - 1; column += 1) {
            const a = index * columns + column;
            const b = a + 1;
            const c = a + columns;
            const d = c + 1;
            indices.push(a, b, c, c, b, d);
        }
    }

    return indices;
};

/** Dunkles Band mit leuchtenden Kanten: Farbverlauf steckt in den Vertexfarben. */
const createRibbonColors = (pointCount: number): Float32Array => {
    const columns = BAND_COLUMNS.length;
    const colors = new Float32Array(pointCount * columns * 3);
    for (let index = 0; index < pointCount; index += 1) {
        for (let column = 0; column < columns; column += 1) {
            const isEdge = column === 0 || column === columns - 1;
            const tint = isEdge ? BAND_EDGE_COLOR : BAND_CORE_COLOR;
            const offset = (index * columns + column) * 3;
            colors[offset] = tint.r;
            colors[offset + 1] = tint.g;
            colors[offset + 2] = tint.b;
        }
    }

    return colors;
};

/** Abgerundete Karte: Gruppe 0 sind Vorder-/R\u00fcckseite, Gruppe 1 die Kanten. */
/**
 * Bandschlaufe, Nietplättchen und Karabinerhaken — der Haken greift durch den
 * Schlitz der Karte, wie beim Original-Lanyard.
 */
const createClip = (): THREE.Group => {
    const clip = new THREE.Group();
    const plastic = new THREE.MeshBasicMaterial({ color: new THREE.Color('#12191f') });
    const metal = new THREE.MeshBasicMaterial({ color: new THREE.Color('#aebac4') });

    const crimp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.06), plastic);
    crimp.position.y = -0.02;

    const swivel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 8), metal);
    swivel.position.y = -0.12;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 16), metal);
    ring.position.y = -0.24;

    // Offener Ring = Haken; die Lücke zeigt zur Karte.
    const hook = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.024, 6, 18, Math.PI * 1.45),
        metal,
    );
    hook.position.y = -0.44;
    hook.rotation.z = Math.PI * 0.75;

    clip.add(crimp, swivel, ring, hook);
    clip.children.forEach((child) => {
        child.frustumCulled = false;
    });
    clip.frustumCulled = false;

    return clip;
};

const createCardGeometry = (): THREE.ExtrudeGeometry => {
    const radius = 0.42;
    const halfWidth = CARD_WIDTH * 0.5;
    const halfHeight = CARD_HEIGHT * 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth + radius, -halfHeight);
    shape.lineTo(halfWidth - radius, -halfHeight);
    shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
    shape.lineTo(halfWidth, halfHeight - radius);
    shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
    shape.lineTo(-halfWidth + radius, halfHeight);
    shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
    shape.lineTo(-halfWidth, -halfHeight + radius);
    shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.05,
        bevelEnabled: false,
        curveSegments: 16,
    });
    geometry.translate(0, 0, -0.025);

    // ExtrudeGeometry legt Welt-Koordinaten als UV ab; auf 0..1 der Kartenfl\u00e4che umrechnen.
    const position = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (let index = 0; index < uv.count; index += 1) {
        uv.setXY(
            index,
            (position.getX(index) + halfWidth) / CARD_WIDTH,
            (position.getY(index) + halfHeight) / CARD_HEIGHT,
        );
    }
    uv.needsUpdate = true;

    return geometry;
};

/**
 * Zeichnet das Portraitbild formatfüllend auf die Karte, sobald es geladen ist.
 * Der generierte Text bleibt als Platzhalter sichtbar, bis das Bild da ist.
 */
const paintCardImage = (canvas: HTMLCanvasElement, texture: THREE.CanvasTexture): void => {
    const context = canvas.getContext('2d');
    if (!context) {
        return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
        const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(
            image,
            (canvas.width - width) * 0.5,
            (canvas.height - height) * 0.5,
            width,
            height,
        );

        // Lochung für den Bandclip erneut setzen, damit sie über dem Bild liegt.
        context.fillStyle = '#20303c';
        context.beginPath();
        context.roundRect(canvas.width * 0.5 - 46, 46, 92, 24, 12);
        context.fill();

        texture.needsUpdate = true;
    };
    image.src = CARD_IMAGE_URL;
};

const createCardTexture = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_TEXTURE_WIDTH;
    canvas.height = CARD_TEXTURE_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) {
        return canvas;
    }

    const background = context.createLinearGradient(0, 0, 0, CARD_TEXTURE_HEIGHT);
    background.addColorStop(0, '#ffffff');
    background.addColorStop(0.6, '#eef3f7');
    background.addColorStop(1, '#dde6ee');
    context.fillStyle = background;
    context.fillRect(0, 0, CARD_TEXTURE_WIDTH, CARD_TEXTURE_HEIGHT);

    // Lochung f\u00fcr den Bandclip.
    context.fillStyle = '#20303c';
    context.beginPath();
    context.roundRect(CARD_TEXTURE_WIDTH * 0.5 - 46, 46, 92, 24, 12);
    context.fill();

    context.textAlign = 'center';
    context.fillStyle = '#0d1a22';
    context.font = '600 64px Urbanist, sans-serif';
    context.fillText('ADNAN', CARD_TEXTURE_WIDTH * 0.5, CARD_TEXTURE_HEIGHT * 0.5);
    context.fillText('AYDIN', CARD_TEXTURE_WIDTH * 0.5, CARD_TEXTURE_HEIGHT * 0.5 + 70);

    context.fillStyle = '#2bb3d6';
    context.fillRect(CARD_TEXTURE_WIDTH * 0.5 - 64, CARD_TEXTURE_HEIGHT * 0.58, 128, 4);

    context.fillStyle = '#3d525f';
    context.font = '300 30px Urbanist, sans-serif';
    context.fillText('Senior Full-Stack', CARD_TEXTURE_WIDTH * 0.5, CARD_TEXTURE_HEIGHT * 0.66);
    context.fillText('Entwickler', CARD_TEXTURE_WIDTH * 0.5, CARD_TEXTURE_HEIGHT * 0.66 + 38);

    context.fillStyle = '#7c8b96';
    context.font = '300 24px Urbanist, sans-serif';
    context.fillText('Z\u00fcrich \u00b7 CH', CARD_TEXTURE_WIDTH * 0.5, CARD_TEXTURE_HEIGHT - 70);

    return canvas;
};
