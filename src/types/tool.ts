import {ComponentType} from "react";
import {UnderDevelopmentViewProps} from "@/components/sections/under-development-view";

export type ToolCategory =
    | "audio"
    | "video"
    | "image"
    | "pdf"
    | "text";

export interface Tool {
    slug: string;
    title: string;
    description: string;
    category: ToolCategory;
    iconId: string;

    component: ComponentType<UnderDevelopmentViewProps>;

    keywords?: string[];

    seo?: {
        title?: string;
        description?: string;
    };
}
