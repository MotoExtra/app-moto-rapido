import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RefreshCw, Check, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type LogoStyle = "monogram" | "silhouette" | "badge" | "typography";

interface LogoOption {
  style: LogoStyle;
  title: string;
  description: string;
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialLogos: LogoOption[] = [
  {
    style: "monogram",
    title: "Monograma Premium",
    description: "Letras M e E elegantes com linhas de velocidade",
    imageUrl: null,
    isLoading: false,
    error: null,
  },
  {
    style: "silhouette",
    title: "Silhueta Estilizada",
    description: "Motoboy em movimento, estilo line art minimalista",
    imageUrl: null,
    isLoading: false,
    error: null,
  },
  {
    style: "badge",
    title: "Badge Premium",
    description: "Emblema profissional com moto estilizada",
    imageUrl: null,
    isLoading: false,
    error: null,
  },
  {
    style: "typography",
    title: "Tipográfica Bold",
    description: "Letra M com elementos de movimento",
    imageUrl: null,
    isLoading: false,
    error: null,
  },
];

const LogoPreview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [logos, setLogos] = useState<LogoOption[]>(initialLogos);
  const [selectedLogo, setSelectedLogo] = useState<LogoStyle | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const generateLogo = async (style: LogoStyle) => {
    setLogos((prev) =>
      prev.map((logo) =>
        logo.style === style
          ? { ...logo, isLoading: true, error: null }
          : logo
      )
    );

    try {
      const { data, error } = await supabase.functions.invoke("generate-logo", {
        body: { style },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setLogos((prev) =>
        prev.map((logo) =>
          logo.style === style
            ? { ...logo, imageUrl: data.imageUrl, isLoading: false }
            : logo
        )
      );

      toast({
        title: "Logo gerado!",
        description: `${style} criado com sucesso.`,
      });
    } catch (error: any) {
      console.error("Error generating logo:", error);
      setLogos((prev) =>
        prev.map((logo) =>
          logo.style === style
            ? { ...logo, error: error.message || "Erro ao gerar", isLoading: false }
            : logo
        )
      );
      toast({
        title: "Erro ao gerar logo",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const generateAllLogos = async () => {
    setIsGeneratingAll(true);
    
    for (const logo of logos) {
      if (!logo.imageUrl) {
        await generateLogo(logo.style);
        // Small delay between generations to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    
    setIsGeneratingAll(false);
  };

  const handleSelectLogo = (style: LogoStyle) => {
    setSelectedLogo(style);
    toast({
      title: "Logo selecionado!",
      description: "Para aplicar este logo, faça o download e me envie para atualizar o app.",
    });
  };

  const getGeneratedCount = () => logos.filter((l) => l.imageUrl).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Logos Premium MotoExtra</h1>
            <p className="text-muted-foreground text-sm">
              Gerados por IA • {getGeneratedCount()}/4 criados
            </p>
          </div>
        </div>

        {/* Generate All Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            onClick={generateAllLogos}
            disabled={isGeneratingAll || getGeneratedCount() === 4}
            className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gerando logos...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Gerar Todos os Logos
              </>
            )}
          </Button>
        </motion.div>

        {/* Logo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {logos.map((logo, index) => (
              <motion.div
                key={logo.style}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`overflow-hidden transition-all duration-300 ${
                    selectedLogo === logo.style
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:shadow-lg"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {logo.title}
                      {selectedLogo === logo.style && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {logo.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Logo Preview Area */}
                    <div className="relative aspect-square bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center">
                      {logo.isLoading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Gerando...
                          </span>
                        </div>
                      ) : logo.imageUrl ? (
                        <img
                          src={logo.imageUrl}
                          alt={logo.title}
                          className="w-full h-full object-contain p-4"
                        />
                      ) : logo.error ? (
                        <div className="text-center p-4">
                          <p className="text-sm text-destructive mb-2">
                            {logo.error}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateLogo(logo.style)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Tentar novamente
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <Skeleton className="w-32 h-32 mx-auto rounded-lg mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Clique para gerar
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {!logo.imageUrl && !logo.isLoading ? (
                        <Button
                          onClick={() => generateLogo(logo.style)}
                          className="flex-1"
                          disabled={isGeneratingAll}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Gerar
                        </Button>
                      ) : logo.imageUrl ? (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => generateLogo(logo.style)}
                            disabled={logo.isLoading || isGeneratingAll}
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${
                                logo.isLoading ? "animate-spin" : ""
                              }`}
                            />
                          </Button>
                          <Button
                            onClick={() => handleSelectLogo(logo.style)}
                            className="flex-1"
                            variant={
                              selectedLogo === logo.style ? "default" : "outline"
                            }
                          >
                            {selectedLogo === logo.style ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Selecionado
                              </>
                            ) : (
                              "Selecionar"
                            )}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Preview Sizes */}
        {selectedLogo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview em Diferentes Tamanhos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-6 justify-center">
                  {[24, 48, 64, 96, 128].map((size) => {
                    const selectedLogoData = logos.find(
                      (l) => l.style === selectedLogo
                    );
                    return (
                      <div key={size} className="text-center">
                        <div
                          className="bg-muted rounded-lg overflow-hidden mx-auto mb-1 flex items-center justify-center"
                          style={{ width: size, height: size }}
                        >
                          {selectedLogoData?.imageUrl && (
                            <img
                              src={selectedLogoData.imageUrl}
                              alt="Preview"
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {size}px
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Como aplicar o logo:</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Clique em "Gerar Todos os Logos" para criar as 4 opções</li>
            <li>Selecione o logo que mais agrada</li>
            <li>Clique com botão direito na imagem e salve</li>
            <li>Envie a imagem no chat para eu atualizar o app</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default LogoPreview;
