import {notFound} from "next/navigation";
import {UnderDevelopmentView} from "@/components/sections/under-development-view";
import {TOOLS} from "@/registry/tools";

interface ToolPageProps {
    params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
    return TOOLS.map((tool) => ({
        id: tool.slug,
    }));
}

export async function generateMetadata({params}: ToolPageProps) {
    const {id} = await params;
    const tool = TOOLS.find((t) => t.slug === id);

    if (!tool) {
        return {
            title: "Tool Not Found | Craft",
        };
    }

    return {
        title: `${tool.title} | Craft - Free Online Tool`,
        description: tool.description,
    };
}

export default async function ToolPage({params}: ToolPageProps) {
    const {id} = await params;
    const tool = TOOLS.find((t) => t.slug === id);

    if (!tool) {
        notFound();
    }

    return <UnderDevelopmentView tool={tool}/>;
}
