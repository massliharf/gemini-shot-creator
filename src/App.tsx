import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Generator from "./pages/Generator";
import PackCreator from "./pages/PackCreator";
import Styles from "./pages/Styles";
import PackEditor from "./pages/PackEditor";
import CloudFiles from "./pages/CloudFiles";
import QuoteGenerator from "./pages/QuoteGenerator";
import GlassesGenerator from "./pages/GlassesGenerator";
import TextToImage from "./pages/TextToImage";
import PromptGenerator from "./pages/PromptGenerator";
import Usage from "./pages/Usage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/generator" element={<Generator />} />
            <Route path="/pack-creator" element={<PackCreator />} />
            <Route path="/styles" element={<Styles />} />
            <Route path="/pack-editor" element={<PackEditor />} />
            <Route path="/cloud-files" element={<CloudFiles />} />
            <Route path="/quote-generator" element={<QuoteGenerator />} />
            <Route path="/glasses-generator" element={<GlassesGenerator />} />
            <Route path="/text-to-image" element={<TextToImage />} />
            <Route path="/prompt-generator" element={<PromptGenerator />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
