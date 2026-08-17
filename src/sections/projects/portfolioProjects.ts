import { type PortfolioProject } from './portfolioConstellation';
import { preloadImage } from '../../utils/assetLoaders';
import { portfolioSkills } from './portfolioSkills';
import {
    PROJECT_DETAILS_IMAGE_SIZES,
    PROJECT_PREVIEW_IMAGE_SIZES,
    projectImagesById,
} from './projectImageAssets';

const withProjectScreenshots = (projects: PortfolioProject[]): PortfolioProject[] =>
    projects.map((project) => ({
        ...project,
        screenshot: projectImagesById[project.id]?.preview,
        detailsScreenshot: projectImagesById[project.id]?.details,
        skills: project.skills.map(
            (skill) =>
                portfolioSkills[portfolioSkills.findIndex((s) => s.id === skill)]?.label ?? skill,
        ),
    }));

const getAdjacentProjects = (
    project: PortfolioProject,
    projects: PortfolioProject[],
): PortfolioProject[] => {
    const index = projects.findIndex((candidate) => candidate.id === project.id);
    if (index < 0 || projects.length < 2) {
        return [];
    }

    return [
        projects[(index - 1 + projects.length) % projects.length],
        projects[(index + 1) % projects.length],
    ];
};

export const preloadAdjacentProjectScreenshots = (project: PortfolioProject): void => {
    const constellationProjects = portfolioProjects.filter(
        (candidate) => candidate.constellation.id === project.constellation.id,
    );
    const adjacentProjects = new Set([
        ...getAdjacentProjects(project, portfolioProjects),
        ...getAdjacentProjects(project, constellationProjects),
    ]);

    adjacentProjects.forEach((candidate) => {
        if (candidate.screenshot) {
            preloadImage(candidate.screenshot, PROJECT_PREVIEW_IMAGE_SIZES);
        }
    });
};

export const preloadAdjacentProjectDetails = async (project: PortfolioProject): Promise<void> => {
    const adjacentScreenshots = getAdjacentProjects(project, portfolioProjects).flatMap(
        (candidate) => (candidate.detailsScreenshot ? [candidate.detailsScreenshot] : []),
    );

    await Promise.allSettled(
        adjacentScreenshots.map((source) => preloadImage(source, PROJECT_DETAILS_IMAGE_SIZES)),
    );
};

const frontEndProjects: PortfolioProject[] = [
    {
        id: 'interactive-3d-portfolio',
        title: 'Adnan Aydin · Kamil Nowak — 3D Portfolio',
        label: 'ADNAN AYDIN KAMIL NOWAK 3D PORTFOLIE',

        description:
            'Im Sommer 2026 entstandenes 3D-Portfolio, inspiriert von der Arbeit von Kamil Nowak — vielen Dank dafür. Eine eigene Three.js-Szene trägt die Sternbild-Navigation, GLSL-Shader, die Partikeltypografie und die scroll-getriebenen GSAP-Übergänge.',

        period: 'Sommer 2026',

        role: 'Creative Developer',

        skills: [
            'front-end',
            'typescript',
            'vite',
            'three-js',
            'webgl',
            'glsl',
            'shader-development',
            'particle-systems',
            'post-processing',
            'gsap',
            'scroll-trigger',
            'scroll-smoother',
            'split-text',
            'web-workers',
            'verlet-physics',
            'entity-component-system',
            'scss',
            'responsive-design',
            'accessibility',
            'seo',
            'zod',
            'cloudflare-pages',
            'resend',
            'performance-optimization',
        ],

        domain: 'Creative Web Development / Interactive 3D',

        owner: 'Independent Personal Project',
        constellation: {
            id: 'front-end',
            position: [-1.02, 0.82, -0.18],
            links: ['eaydin-portfolio'],
        },
    },
    {
        id: 'it-services',

        title: 'SAZCAR GMBH — Autowerkstatt Homepage',
        label: 'SAZCAR GMBH',

        description:
            'Homepage für einen Freund mit einer Autowerkstatt in Zürich, entstanden 2026. Die Seite stellt Dienstleistungen, Kontaktdaten und Standort übersichtlich dar — responsive und modern umgesetzt.',

        period: '2026',
        role: 'Entwickler',

        skills: ['front-end', 'html', 'css', 'javascript', 'responsive-design', 'github-pages'],

        domain: 'Autowerkstatt / Web',
        owner: 'SAZCAR GMBH, Zürich',
        liveUrl: 'https://sazcar.ch',

        constellation: {
            id: 'front-end',
            position: [-1.38, -0.81, 0.12],
            links: ['adnan-3d'],
        },
    },
    {
        id: 'adnan-3d',
        title: 'ADNAN 3D',
        label: 'ADNAN 3D',

        description:
            'Seit 2026 gewachsene Lern- und Lehrplattform rund um künstliche Intelligenz: Prompts, Serverbefehle und experimentelle Arbeiten sind dort gesammelt und nachvollziehbar aufbereitet. Die Seite ist bewusst als Werkstatt gebaut — ausprobieren, festhalten, weitergeben.',

        period: 'seit 2026',
        role: 'Entwickler',

        skills: [
            'front-end',
            'typescript',
            'vite',
            'supabase',
            'ai-integration',
            'prompt-engineering',
            'server-administration',
            'responsive-design',
        ],

        domain: 'Künstliche Intelligenz / Wissensplattform',
        owner: 'Privatprojekt',
        liveUrl: 'https://adnanwalk.vercel.app/',

        constellation: {
            id: 'front-end',
            position: [-0.42, -0.16, 0.02],
            links: ['eren-aydin-portfolio', 'interactive-3d-portfolio'],
        },
    },
    {
        id: 'eren-aydin-portfolio',

        title: 'Eren Aydin — Interaktives Portfolio',
        label: 'EREN AYDIN PORTFOLIE',

        description:
            'Interaktives Bewerbungsportfolio für meinen Sohn, der 2026 seine Lehre begonnen hat. Scroll-getriebene Animationen führen durch Person, Schulweg und Projekte; der Aufbau ist mobil zuerst gedacht und lädt auch auf älteren Geräten schnell.',

        period: '2026',
        role: 'Entwickler',

        skills: [
            'front-end',
            'typescript',
            'vite',
            'gsap',
            'scroll-trigger',
            'html',
            'scss',
            'responsive-design',
            'motion-design',
        ],

        domain: 'Persönliches Portfolio / Bewerbung',
        owner: 'Privatprojekt',
        liveUrl: 'https://erenaydin.ch',

        constellation: {
            id: 'front-end',
            position: [0.52, 0.45, -0.1],
            links: ['eaydin-portfolio'],
        },
    },
    {
        id: 'happybeck',
        title: 'Happy Beck — Website einer Schweizer Bäckerei',
        label: 'HAPPYBECK',

        description:
            'Webauftritt für eine Bäckerei in der Schweiz: Sortiment, Filialen und Öffnungszeiten in einem schnellen, mobil zuerst gedachten Auftritt. Umgesetzt mit React, TypeScript und Material UI, live im Einsatz.',

        period: '2026',
        role: 'Front-End Entwickler',

        skills: ['front-end', 'react', 'typescript', 'material-ui', 'responsive-web-design'],

        domain: 'Gastronomie / Detailhandel',
        owner: 'Bäckerei Happy AG, Zürich',
        liveUrl: 'https://superonline.ch',

        constellation: {
            id: 'front-end',
            position: [0.74, 2.1, -0.38],
            links: [],
        },
    },
    {
        id: 'eaydin-portfolio',
        title: 'PORTFOLIE EAYDIN',
        label: 'PORTFOLIE EAYDIN',
        description:
            'Meine erste Arbeit nach vielen Jahren zurück im Web: ein eigenes Portfolio, gebaut, um wieder in die aktuelle Front-End-Welt hineinzukommen. Aufbau, Layout und Animationen sind von Hand gesetzt, ohne Baukasten.',
        period: '2025',
        role: 'Entwickler',
        skills: [
            'front-end',
            'html',
            'css',
            'scss',
            'javascript',
            'responsive-design',
            'motion-design',
        ],
        domain: 'Persönliches Portfolio',
        owner: 'Privatprojekt',
        liveUrl: 'https://erenworks.vercel.app/',
        constellation: {
            id: 'front-end',
            position: [-0.08, 1.5, -0.28],
            links: ['happybeck'],
        },
    },
];

const fullStackProjects: PortfolioProject[] = [
    {
        id: 'masters-thesis',
        title: 'Master’s Thesis: Real-time Groupware Synchronization Application (Collab)',
        label: 'Collab Sync',

        description:
            'A research-driven groupware application exploring real-time synchronization across distributed clients. The project focused on conflict handling, data consistency, and the architectural trade-offs required for reliable collaborative editing.',

        period: 'February 2020 – July 2021',
        role: 'Master of Engineering Student',

        skills: [
            'full-stack',
            'react',
            'yjs',
            'scss',
            'csharp',
            'aspnet-core',
            'entity-framework-core',
            'sql-server',
            'computer-science-research',
            'synchronization-logic',
            'groupware',
            'distributed-systems',
            'complex-technical-communication',
        ],

        domain: 'Computer Science / Distributed Systems',
        owner: 'AGH University of Krakow',

        constellation: {
            id: 'full-stack',
            position: [0.153, 0.3, 0.12],
            links: ['shareowner-online'],
        },
    },
    {
        id: 'bachelors-thesis',
        title: 'Bachelor’s Thesis: A web-based groupware application that provides a knowledge management solution (Collab)',
        label: 'Collab Knowledge',

        description:
            'A web-based knowledge-management platform designed to help project teams organize and share information. Led a student development team while shaping the architecture, data model, and full-stack implementation.',

        period: 'October 2016 – January 2020',
        role: 'BE Student / .NET Students Scientific Association Leader',

        skills: [
            'full-stack',
            'knowledge-management',
            'web-architecture',
            'react',
            'scss',
            'csharp',
            'aspnet-core',
            'entity-framework-core',
            'sql-server',
            'technical-leadership',
        ],

        domain: 'Computer Science / Knowledge Management',
        owner: 'Cracow University of Technology',

        constellation: {
            id: 'full-stack',
            position: [0.814, 1.292, -0.06],
            links: ['help-and-support'],
            labelOffset: [0, -0.18],
        },
    },
    {
        id: 'shareowner-online',
        title: 'VOKABELTRAINER — Lernplattform',
        label: 'VOKABELTRAINER',

        description:
            'Eine 2024 entstandene Webseite für Sekundar- und Primarschüler zum Vokabeltraining. Die Idee: Schüler fotografieren eine Seite aus ihrem Lehrbuch, und mithilfe von KI werden daraus Lernkarten generiert. Das Projekt wurde nie ganz fertiggestellt.',

        period: '2024',
        role: 'Entwickler',

        skills: [
            'front-end',
            'react',
            'tailwindcss',
            'html',
            'css',
            'javascript',
            'ai-integration',
            'responsive-design',
        ],

        domain: 'Bildung / KI-gestütztes Lernen',
        owner: 'Privatprojekt',
        liveUrl: 'https://vokabel-hazel.vercel.app/',

        constellation: {
            id: 'full-stack',
            position: [0.383, -0.714, -0.08],
            links: ['equiniti-website'],
            labelOffset: [0, 0.12],
        },
    },
    {
        id: 'abb-cynk-portal',
        title: 'IPHONE SHORTCUTS — Webseite',
        label: 'IPHONE SHORTCUTS',

        description:
            'Eine 2025 entstandene Webseite, inspiriert von den iPhone-Kurzbefehlen. Das Projekt stiess bei vielen Leuten auf Interesse und zeigt interaktive Karten in einem klaren, modernen Layout.',

        period: '2025',
        role: 'Entwickler',

        skills: [
            'front-end',
            'react',
            'tailwindcss',
            'html',
            'css',
            'javascript',
            'responsive-design',
        ],

        domain: 'Creative Web Development',
        owner: 'Privatprojekt',
        liveUrl: 'https://superonline.vercel.app/',

        constellation: {
            id: 'full-stack',
            position: [-1.009, 0.088, 0.1],
            links: ['masters-thesis'],
        },
    },
    {
        id: 'equiniti-website',
        title: 'PORTFOLIE — Meine erste Arbeit',
        label: 'PORTFOLIE',

        description:
            'Eines meiner ersten Projekte, entstanden 2024. Damals hatte ich noch wenig Erfahrung und bin mit der Unterstützung eines türkischen Entwicklers im Projekt vorangekommen. Live unter lebenslauf-xi.vercel.app.',

        period: '2024',
        role: 'Entwickler',

        skills: [
            'front-end',
            'react',
            'tailwindcss',
            'html',
            'css',
            'javascript',
            'responsive-design',
        ],

        domain: 'Persönliches Portfolio',
        owner: 'Privatprojekt',
        liveUrl: 'https://lebenslauf-xi.vercel.app/',

        constellation: {
            id: 'full-stack',
            position: [-0.773, -0.9, 0],
            links: ['abb-cynk-portal'],
            labelOffset: [0, 0.12],
        },
    },
    {
        id: 'help-and-support',
        title: 'Help & Support Center',
        label: 'Help Center',

        description:
            'A responsive single-page support application for investment-account and employee-scheme customers. Built React interfaces from detailed designs and integrated them with a .NET API gateway that exposed content from a legacy knowledge system.',

        period: 'October 2021 – June 2023',
        role: 'Senior Full-Stack Developer',

        skills: [
            'front-end',
            'react',
            'html',
            'scss',
            'cypress',
            'eq-design-system',
            'typescript',
            'spa-architecture',
        ],

        domain: 'Corporate Services / Financial Support',
        owner: 'Endava (Client: Equiniti)',

        constellation: {
            id: 'full-stack',
            position: [0.45, 0.8, 0.14],
            links: ['masters-thesis'],
        },
    },
];

const backEndProjects: PortfolioProject[] = [
    {
        id: 'groupware-knowledge-platform',
        title: 'Knowledge Management & Collaborative Groupware',
        label: 'Groupware',
        description:
            'A collaborative knowledge platform for organizing and exchanging information within project teams. Led the student team and contributed to the React interface, ASP.NET Core services, persistence model, and overall application architecture.',
        period: 'March 2019 – May 2019',
        role: 'A leader of .NET students scientific association | Group representative',
        skills: [
            'back-end',
            'csharp',
            'aspnet-core',
            'mvc',
            'react',
            'sql-server',
            'entity-framework-core',
            'technical-leadership',
        ],
        domain: 'Computer Science / Knowledge Management / Collaborative Systems',
        owner: 'Cracow University of Technology',

        constellation: {
            id: 'back-end',
            position: [0.64, 1.14, -0.3],
            links: ['kvl-security-device', 'onboarding-solution'],
        },
    },
    {
        id: 'kvl-security-device',
        title: 'Security Device (KVL)',
        label: 'Security Device (KVL)',

        description:
            'An Android-based Key Variable Loader for securely managing encryption keys used by communication systems. Contributed to implementation, automated testing, local persistence, and cryptographic workflows in a security-sensitive environment.',

        period: 'July 2018 – September 2018',
        role: 'Intern C# .NET Software Developer',

        skills: [
            'back-end',
            'csharp',
            'android-platform',
            'xamarin',
            'mvvmcross',
            'jenkins',
            'cryptography',
            'security',
            'sqlite',
            'api-security',
        ],

        domain: 'Cybersecurity / Key Management',
        owner: 'Motorola Solutions',

        constellation: {
            id: 'back-end',
            position: [-0.48, -0.92, -0.02],
            labelOffset: [0.28, 0],
            links: ['onboarding-solution'],
        },
    },
    {
        id: 'onboarding-solution',
        title: 'FOREX.COM Onboarding Solution',
        label: 'Onboarding',

        description:
            'A regulated fintech platform supporting client acquisition, onboarding, and lifecycle management. Developed RESTful services and business workflows that connected client-facing applications with internal systems and operational processes.',

        period: 'July 2019 – September 2021',
        role: '.NET Software Engineer',

        skills: [
            'back-end',
            'csharp',
            'aspnet-core',
            'tsql',
            'activemq',
            'specflow',
            'teamcity',
            'fluent-assertions',
            'rest-web-services',
        ],

        domain: 'Fintech / Client Acquisition',
        owner: 'StoneX',

        constellation: {
            id: 'back-end',
            position: [-1, 0.66, 0.1],
            labelOffset: [-0.05, 0.05],
            links: [],
        },
    },
];

const constellationScrollOrder = {
    'front-end': 0,
    'full-stack': 1,
    'back-end': 2,
} satisfies Record<PortfolioProject['constellation']['id'], number>;

const compareProjectScrollOrder = (a: PortfolioProject, b: PortfolioProject): number =>
    constellationScrollOrder[a.constellation.id] - constellationScrollOrder[b.constellation.id] ||
    a.constellation.position[0] - b.constellation.position[0] ||
    b.constellation.position[1] - a.constellation.position[1];

const portfolioProjectsWithoutScreenshots: PortfolioProject[] = [
    ...frontEndProjects,
    ...fullStackProjects,
    ...backEndProjects,
].sort(compareProjectScrollOrder);

export const portfolioProjects: PortfolioProject[] = withProjectScreenshots(
    portfolioProjectsWithoutScreenshots,
);
