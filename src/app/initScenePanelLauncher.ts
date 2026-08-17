import type { World } from '../world/World';

type ScenePanel = { domElement: HTMLElement; open: () => void; destroy: () => void };

/**
 * Hängt «SZENE» in die Navigation. Das Panel selbst wird erst beim ersten Klick
 * nachgeladen — wer es nie öffnet, lädt lil-gui gar nicht erst herunter.
 */
export const initScenePanelLauncher = (world: World): (() => void) => {
    const navList = document.querySelector('.nav__link-wrapper-container');
    if (!navList) {
        return () => {};
    }

    const navItem = document.createElement('li');
    navItem.className = 'nav__link-wrapper';
    navItem.style.cssText =
        'border-radius:999px;padding:0.05rem 0.7rem;background:radial-gradient(130% 180% at 50% 0%,rgb(134 234 255 / 20%),rgb(134 234 255 / 5%) 62%,transparent 100%);box-shadow:0 0 20px rgb(130 235 255 / 22%),inset 0 0 0 1px rgb(134 234 255 / 32%);backdrop-filter:blur(4px)';
    navItem.innerHTML =
        '<button class="nav__link animated" type="button" style="border:0;font:inherit;cursor:pointer;color:transparent;background:var(--navigation-link-gradient);background-size:200% 100%;background-position:200% 50%;background-repeat:repeat-x;background-clip:text;filter:drop-shadow(0 0 6px rgb(130 235 255 / 45%));animation:navigation-link-gradient-shift 1.6s linear infinite">SZENE</button>';
    navList.append(navItem);

    let panel: ScenePanel | undefined;
    let loading = false;

    navItem.addEventListener('click', () => {
        if (panel) {
            const hidden = panel.domElement.style.display === 'none';
            panel.domElement.style.display = hidden ? '' : 'none';
            if (hidden) {
                panel.open();
            }
            return;
        }
        if (loading) {
            return;
        }

        loading = true;
        void import('./scenePanel')
            .then(({ initScenePanel }) => {
                panel = initScenePanel(world.getDebugTargets()) as unknown as ScenePanel;
            })
            .catch((error) => {
                console.error('Failed to open the scene panel', error);
            })
            .finally(() => {
                loading = false;
            });
    });

    return () => {
        navItem.remove();
        panel?.destroy();
    };
};
