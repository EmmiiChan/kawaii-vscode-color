export const RENDERER_PLACEHOLDERS = [
    "DISABLE_GLOW",
    "EDITOR_BACKGROUND_AREA_BOTTOM",
    "EDITOR_BACKGROUND_AREA_HEIGHT",
    "EDITOR_BACKGROUND_AREA_LEFT",
    "EDITOR_BACKGROUND_AREA_RIGHT",
    "EDITOR_BACKGROUND_AREA_TOP",
    "EDITOR_BACKGROUND_AREA_WIDTH",
    "EDITOR_BACKGROUND_IMAGE",
    "EDITOR_BACKGROUND_IMAGE_OPACITY",
    "EDITOR_BACKGROUND_IMAGE_POSITION",
    "EDITOR_BACKGROUND_IMAGE_REPEAT",
    "EDITOR_BACKGROUND_IMAGE_SIZE",
    "EMPTY_EDITOR_LOGO_STYLES",
    "KAWAII_UI_STYLE_VERSION",
    "NEON_BRIGHTNESS"
] as const;

export type RendererPlaceholder = typeof RENDERER_PLACEHOLDERS[number];

export type RendererPlaceholderValues = Readonly<Partial<Record<RendererPlaceholder, string>>>;

export function isRendererPlaceholder(value: unknown): value is RendererPlaceholder {
    return typeof value === "string" && RENDERER_PLACEHOLDERS.includes(value as RendererPlaceholder);
}

export function createRendererPlaceholderToken(placeholder: RendererPlaceholder): string {
    return `[${placeholder}]`;
}

export function findRendererPlaceholders(template: string): RendererPlaceholder[] {
    return RENDERER_PLACEHOLDERS.filter((placeholder) =>
        template.includes(createRendererPlaceholderToken(placeholder))
    );
}

export function replaceRendererPlaceholders(template: string, values: RendererPlaceholderValues): string {
    return RENDERER_PLACEHOLDERS.reduce((content, placeholder) => {
        if (!Object.prototype.hasOwnProperty.call(values, placeholder)) {
            return content;
        }

        const replacement = values[placeholder] ?? "";
        return content.split(createRendererPlaceholderToken(placeholder)).join(replacement);
    }, template);
}
