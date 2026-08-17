import { z } from 'zod';

export const contactSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Mindestens 2 Zeichen eingeben.')
        .max(80, 'Höchstens 80 Zeichen verwenden.'),

    email: z
        .string()
        .trim()
        .min(1, 'E-Mail-Adresse eingeben.')
        .max(254, 'Höchstens 254 Zeichen verwenden.')
        .pipe(
            z.email({
                error: 'Gültige E-Mail-Adresse eingeben.',
            }),
        ),

    message: z
        .string()
        .trim()
        .min(10, 'Mindestens 10 Zeichen eingeben.')
        .max(4_000, 'Höchstens 4000 Zeichen verwenden.'),
});

export type ContactMessage = z.infer<typeof contactSchema>;
