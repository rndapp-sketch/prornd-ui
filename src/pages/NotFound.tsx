import { useNavigate } from "react-router-dom";
import { useFrappeAuth } from "frappe-react-sdk";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F9F7F2] dark:bg-[#18181B] px-4">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D97757]/10 text-[#D97757]">
                    <FileQuestion className="h-8 w-8" />
                </div>

                <p className="text-sm font-semibold uppercase tracking-widest text-[#D97757]">
                    404 error
                </p>
                <h1 className="mt-2 text-3xl font-bold text-[#18181B] dark:text-white">
                    Page not found
                </h1>
                <p className="mt-3 text-sm text-[#71717A] dark:text-[#A1A1AA]">
                    The page you're looking for doesn't exist or may have been moved.
                    Double-check the URL, or head back to a page you know.
                </p>

                <div className="mt-8 flex items-center justify-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go back
                    </Button>
                    <Button
                        onClick={() => navigate(currentUser ? "/dashboard" : "/login", { replace: true })}
                        className="bg-[#D97757] hover:bg-[#c9663f] text-white"
                    >
                        {currentUser ? "Go to dashboard" : "Go to login"}
                    </Button>
                </div>

                <p className="mt-10 text-xs text-[#A1A1AA]">
                    © {new Date().getFullYear()} Research &amp; Development Cell, IIT Guwahati
                </p>
            </div>
        </div>
    );
};

export default NotFound;
