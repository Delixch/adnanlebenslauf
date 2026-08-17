import GUI from 'lil-gui';

import type { World } from '../world/World';

type SceneTargets = ReturnType<World['getDebugTargets']>;

type ResetEntry = { restore: () => void };

/**
 * Besucherpanel für die Szene: bewusst kuratiert statt vollständig. Die
 * Wertebereiche lassen bewusst kein Ausschalten zu — wer schiebt, soll spielen
 * können, ohne die Seite schwarz zu machen. «Zurücksetzen» stellt alles her.
 */
export const initScenePanel = ({
    mainCloudMaterial,
    coloredLightMaterial,
    shaderUniformComponents,
    selectiveBloom,
    bloomPass,
    afterimagePass,
}: SceneTargets): GUI => {
    const gui = new GUI({ title: 'Szene' });
    const resets: ResetEntry[] = [];

    const trackNumber = (uniform: { value: number }): void => {
        const initial = uniform.value;
        resets.push({ restore: () => (uniform.value = initial) });
    };
    const trackColor = (target: { getHex: () => number; setHex: (hex: number) => void }): void => {
        const initial = target.getHex();
        resets.push({ restore: () => target.setHex(initial) });
    };

    const floatingTextShader = shaderUniformComponents.find(
        (shader) => shader.bindScrollProgress && !shader.bindColoredLightVisibility,
    );

    // ---------------------------------------------------------------- Partikel
    const particles = gui.addFolder('Partikel');
    const cloudUniforms = mainCloudMaterial.uniforms;

    trackNumber(cloudUniforms.uSizeBase);
    particles.add(cloudUniforms.uSizeBase, 'value', 60, 400, 1).name('Grösse');

    trackNumber(cloudUniforms.uCloudBrightness);
    particles.add(cloudUniforms.uCloudBrightness, 'value', 0.6, 4, 0.01).name('Helligkeit');

    trackNumber(cloudUniforms.uParticleDensity);
    particles.add(cloudUniforms.uParticleDensity, 'value', 0.35, 1, 0.01).name('Dichte');

    trackNumber(cloudUniforms.uSparkleStrength);
    particles.add(cloudUniforms.uSparkleStrength, 'value', 0, 2, 0.01).name('Funkeln');

    // ------------------------------------------------------------------ Farben
    const colors = gui.addFolder('Farben');
    const geminiColors = cloudUniforms.uGeminiColors.value as Array<{
        getHex: () => number;
        setHex: (hex: number) => void;
    }>;
    const paletteNames = ['Blau', 'Grün', 'Violett', 'Rot', 'Türkis'];
    geminiColors.forEach((color, index) => {
        trackColor(color);
        colors.addColor(geminiColors, index).name(paletteNames[index] ?? `Farbe ${index + 1}`);
    });

    trackColor(cloudUniforms.uColor.value);
    colors.addColor(cloudUniforms.uColor, 'value').name('Grundton');

    trackColor(cloudUniforms.uBloomColor.value);
    colors.addColor(cloudUniforms.uBloomColor, 'value').name('Leuchten');

    if (floatingTextShader) {
        const textBloom = floatingTextShader.material.uniforms.uBloomColor;
        trackColor(textBloom.value);
        colors.addColor(textBloom, 'value').name('Schriftleuchten');
    }

    // --------------------------------------------------------------- Bewegung
    const motion = gui.addFolder('Bewegung');
    const wind = cloudUniforms.uWindDirection.value as { x: number; y: number; z: number };
    const initialWind = { x: wind.x, y: wind.y, z: wind.z };
    resets.push({
        restore: () => {
            wind.x = initialWind.x;
            wind.y = initialWind.y;
            wind.z = initialWind.z;
        },
    });
    motion.add(wind, 'x', -1, 1, 0.01).name('Wind ←→');
    motion.add(wind, 'y', -1, 1, 0.01).name('Wind ↑↓');

    trackNumber(cloudUniforms.uCurveStrength);
    motion.add(cloudUniforms.uCurveStrength, 'value', 0, 2, 0.01).name('Schriftbogen');

    trackNumber(cloudUniforms.uTunnelRadiusScale);
    motion.add(cloudUniforms.uTunnelRadiusScale, 'value', 0.5, 2.5, 0.01).name('Tunnelweite');

    if (floatingTextShader) {
        const { uniforms } = floatingTextShader.material;
        trackNumber(uniforms.uSpeed);
        motion.add(uniforms.uSpeed, 'value', 0, 6, 0.01).name('Schrifttempo');
    }

    // ------------------------------------------------------------------ Licht
    const light = gui.addFolder('Farbband');
    const lightUniforms = coloredLightMaterial.uniforms;

    trackNumber(lightUniforms.uIntensity);
    light.add(lightUniforms.uIntensity, 'value', 0, 0.6, 0.01).name('Stärke');

    trackNumber(lightUniforms.uSpeed);
    light.add(lightUniforms.uSpeed, 'value', 0, 200, 1).name('Tempo');

    trackNumber(lightUniforms.uWidth);
    light.add(lightUniforms.uWidth, 'value', 80, 600, 1).name('Breite');

    // ---------------------------------------------------------------- Effekte
    const effects = gui.addFolder('Effekte');
    const initialBloomScale = selectiveBloom.strengthScale;
    const initialThreshold = bloomPass.threshold;
    const initialAfterimage = afterimagePass.enabled;
    resets.push({
        restore: () => {
            selectiveBloom.strengthScale = initialBloomScale;
            bloomPass.threshold = initialThreshold;
            afterimagePass.enabled = initialAfterimage;
        },
    });
    effects.add(selectiveBloom, 'strengthScale', 0.2, 3, 0.01).name('Leuchtkraft');
    effects.add(bloomPass, 'threshold', 0, 1, 0.01).name('Schwelle');
    effects.add(afterimagePass, 'enabled').name('Nachbild');

    gui.add(
        {
            reset: () => {
                resets.forEach((entry) => entry.restore());
                gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
            },
        },
        'reset',
    ).name('↺ Zurücksetzen');

    [particles, colors, motion, light, effects].forEach((folder) => folder.close());

    // Panel hängt als Eintrag in der Navigation und öffnet unterhalb davon.
    Object.assign(gui.domElement.style, {
        top: `calc(3.5rem + env(safe-area-inset-top, 0px))`,
        bottom: 'auto',
        maxHeight: 'calc(100svh - 5rem)',
        zIndex: '1200',
    });

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Szene-Panel schliessen');
    closeButton.style.cssText =
        'position:absolute;top:0;right:0;width:2.2rem;height:100%;border:0;background:none;color:inherit;font-size:1.1rem;line-height:1;cursor:pointer';
    gui.$title.style.position = 'relative';
    gui.$title.append(closeButton);
    closeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        gui.domElement.style.display = 'none';
    });

    return gui;
};
