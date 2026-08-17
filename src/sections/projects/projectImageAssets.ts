import groupwareDetailsUrl from '../../assets/projects/groupware-knowledge-platform.png?url';
import groupwarePreviewUrl from '../../assets/projects/previews/groupware-knowledge-platform.webp?url';
import kvlPreviewUrl from '../../assets/projects/previews/kvl-security-device.webp?url';
import responsiveManifest from '../../assets/projects/responsive/manifest.json';
import type { ResponsiveImageSource } from '../../utils/assetLoaders';

export const PROJECT_PREVIEW_IMAGE_SIZES = '(max-width: 767px) 0px, clamp(220px, 22vw, 320px)';
export const PROJECT_DETAILS_IMAGE_SIZES =
    '(max-width: 767px) calc(100vw - 4.5rem), min(calc(42vw - 2rem), 44rem)';

interface ProjectImageSet {
    preview: ResponsiveImageSource;
    details: ResponsiveImageSource;
}

const responsiveUrls = import.meta.glob<string>('../../assets/projects/responsive/*.{png,webp}', {
    eager: true,
    import: 'default',
    query: '?url',
});
const originalUrls = import.meta.glob<string>('../../assets/projects/*.png', {
    eager: true,
    import: 'default',
    query: '?url',
});

const mapAssetUrlsByFilename = (assets: Record<string, string>): Map<string, string> =>
    new Map(
        Object.entries(assets).map(([assetPath, source]) => [
            assetPath.split('/').at(-1) ?? assetPath,
            source,
        ]),
    );

const responsiveUrlsByFilename = mapAssetUrlsByFilename(responsiveUrls);
const originalUrlsByFilename = mapAssetUrlsByFilename(originalUrls);
const existingPreviewUrls = new Map([['kvl-security-device', kvlPreviewUrl]]);

const getGeneratedCandidates = (
    projectId: string,
    variants: Array<{ filename: string; width: number }>,
): Array<{ source: string; width: number }> =>
    variants.map((variant) => {
        const source = responsiveUrlsByFilename.get(variant.filename);
        if (!source) {
            throw new Error(`Missing responsive image for ${projectId}: ${variant.filename}`);
        }

        return { source, width: variant.width };
    });

const createResponsiveImage = (
    candidates: Array<{ source: string; width: number }>,
    width: number,
    height: number,
): ResponsiveImageSource => {
    const fallback = candidates.find((candidate) => candidate.width === 768) ?? candidates.at(-1);
    if (!fallback) {
        throw new Error('Responsive image has no candidates');
    }

    return {
        src: fallback.source,
        srcset: candidates
            .map(({ source, width: candidateWidth }) => `${source} ${candidateWidth}w`)
            .join(', '),
        width,
        height,
    };
};

const responsiveProjectImages = Object.fromEntries(
    responsiveManifest.map((entry) => {
        const previewCandidates = getGeneratedCandidates(entry.id, entry.previewVariants);
        const existingPreview = existingPreviewUrls.get(entry.id);
        const preview =
            previewCandidates.length > 0
                ? createResponsiveImage(previewCandidates, entry.width, entry.height)
                : existingPreview
                  ? { src: existingPreview, width: entry.width, height: entry.height }
                  : undefined;

        const detailCandidates = getGeneratedCandidates(entry.id, entry.detailVariants);
        if (entry.detailOriginal) {
            detailCandidates.push(...getGeneratedCandidates(entry.id, [entry.detailOriginal]));
        } else {
            const original = originalUrlsByFilename.get(`${entry.id}.png`);
            if (!original) {
                throw new Error(`Missing original project image: ${entry.id}.png`);
            }
            detailCandidates.push({ source: original, width: entry.width });
        }

        if (!preview) {
            throw new Error(`Missing project preview image: ${entry.id}`);
        }

        return [
            entry.id,
            {
                preview,
                details: createResponsiveImage(detailCandidates, entry.width, entry.height),
            } satisfies ProjectImageSet,
        ];
    }),
) as Record<string, ProjectImageSet>;

// Extern gehostet (Cloudinary), darum kein Eintrag im responsiven Manifest.
const HAPPYBECK_SCREENSHOT = {
    src: 'https://res.cloudinary.com/ixyonosn/image/upload/v1786933526/Screenshot_2026-08-17_042457.png',
    width: 1560,
    height: 1048,
};

const ADNAN_3D_SCREENSHOT = {
    src: 'https://res.cloudinary.com/ixyonosn/image/upload/v1786934551/Screenshot_2026-08-17_044211.png',
    width: 1547,
    height: 1025,
};

const PORTFOLIO_3D_SCREENSHOT = {
    src: 'https://res.cloudinary.com/ixyonosn/image/upload/v1786934330/Screenshot_2026-08-17_043832.png',
    width: 1561,
    height: 954,
};

const EAYDIN_PORTFOLIO_SCREENSHOT = {
    src: 'https://res.cloudinary.com/ixyonosn/image/upload/v1786934066/Screenshot_2026-08-17_043400.png',
    width: 1562,
    height: 1053,
};

const EREN_PORTFOLIO_SCREENSHOT = {
    src: 'https://res.cloudinary.com/ixyonosn/image/upload/v1786933915/Screenshot_2026-08-17_043125.png',
    width: 1562,
    height: 981,
};

const SAZCAR_SCREENSHOT = {
    src: 'https://res.cloudinary.com/ixyonosn/image/upload/v1786934809/Screenshot_2026-08-17_044627.png',
    width: 1560,
    height: 1048,
};

const IPHONE_SHORTCUTS_SCREENSHOT = {
    src: 'https://res.cloudinary.com/ixyonosn/image/upload/v1786944644/Screenshot_2026-08-17_073017.png',
    width: 1560,
    height: 1048,
};

const PORTFOLIE_SCREENSHOT = {
    src: 'https://res.cloudinary.com/ixyonosn/image/upload/v1786945213/Screenshot_2026-08-17_073850.png',
    width: 1560,
    height: 1048,
};

const VOKABELTRAINER_SCREENSHOT = {
    src: 'https://res.cloudinary.com/ixyonosn/image/upload/v1786946139/Screenshot_2026-08-17_075406.png',
    width: 1560,
    height: 1048,
};

export const projectImagesById: Record<string, ProjectImageSet> = {
    ...responsiveProjectImages,
    'adnan-3d': {
        preview: ADNAN_3D_SCREENSHOT,
        details: ADNAN_3D_SCREENSHOT,
    },
    'interactive-3d-portfolio': {
        preview: PORTFOLIO_3D_SCREENSHOT,
        details: PORTFOLIO_3D_SCREENSHOT,
    },
    'eaydin-portfolio': {
        preview: EAYDIN_PORTFOLIO_SCREENSHOT,
        details: EAYDIN_PORTFOLIO_SCREENSHOT,
    },
    'eren-aydin-portfolio': {
        preview: EREN_PORTFOLIO_SCREENSHOT,
        details: EREN_PORTFOLIO_SCREENSHOT,
    },
    happybeck: {
        preview: HAPPYBECK_SCREENSHOT,
        details: HAPPYBECK_SCREENSHOT,
    },
    'it-services': {
        preview: SAZCAR_SCREENSHOT,
        details: SAZCAR_SCREENSHOT,
    },
    'abb-cynk-portal': {
        preview: IPHONE_SHORTCUTS_SCREENSHOT,
        details: IPHONE_SHORTCUTS_SCREENSHOT,
    },
    'equiniti-website': {
        preview: PORTFOLIE_SCREENSHOT,
        details: PORTFOLIE_SCREENSHOT,
    },
    'shareowner-online': {
        preview: VOKABELTRAINER_SCREENSHOT,
        details: VOKABELTRAINER_SCREENSHOT,
    },
    'groupware-knowledge-platform': {
        preview: {
            src: groupwarePreviewUrl,
            width: 1600,
            height: 900,
        },
        details: {
            src: groupwareDetailsUrl,
            width: 1920,
            height: 1080,
        },
    },
};
