import React, { useEffect, useState } from 'react';
import { Mic, Sparkles, Check, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingContainer } from '../OnboardingContainer';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { toast } from 'sonner';

/**
 * Local Setup Step - Confirms local-first configuration
 *
 * This step informs the user that Maity uses:
 * - Whisper for local transcription (privacy-first)
 * - OpenAI for meeting summaries (cloud)
 *
 * Whisper model will be downloaded on first use.
 */
export function DownloadProgressStep() {
  const {
    goNext,
    completeOnboarding,
    setUseCloudTranscription,
  } = useOnboarding();

  const [isMac, setIsMac] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Detect platform on mount
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        const { platform } = await import('@tauri-apps/plugin-os');
        setIsMac(platform() === 'macos');
      } catch (e) {
        setIsMac(navigator.userAgent.includes('Mac'));
      }
    };
    checkPlatform();
  }, []);

  const handleContinue = async () => {
    setUseCloudTranscription(false);
    setIsCompleting(true);

    try {
      if (isMac) {
        // macOS: Go to Permissions step first
        goNext();
      } else {
        // Non-macOS: Complete onboarding immediately
        await completeOnboarding();
        await new Promise(resolve => setTimeout(resolve, 100));
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to complete setup:', error);
      toast.error('Error al completar la configuración', {
        description: 'Por favor intenta de nuevo.',
      });
      setIsCompleting(false);
    }
  };

  const providers = [
    {
      name: 'Whisper Local',
      description: 'Transcripción local y privada',
      icon: <Mic className="w-5 h-5 text-[#3a4ac3]" />,
      model: 'Small',
    },
    {
      name: 'OpenAI',
      description: 'Resúmenes de reuniones',
      icon: <Sparkles className="w-5 h-5 text-[#16bb7b]" />,
      model: 'GPT-4o',
    },
  ];

  return (
    <OnboardingContainer
      title="Transcripción Local y Privada"
      description="Maity transcribe tus reuniones localmente usando Whisper, garantizando total privacidad. Los resúmenes usan IA en la nube."
      step={3}
      totalSteps={isMac ? 4 : 3}
    >
      <div className="flex flex-col items-center space-y-8">
        {/* Privacy Icon */}
        <div className="w-16 h-16 rounded-full bg-[#f0f2fe] flex items-center justify-center">
          <Shield className="w-8 h-8 text-[#3a4ac3]" />
        </div>

        {/* Provider Cards */}
        <div className="w-full max-w-md space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.name}
              className="bg-white dark:bg-gray-800 rounded-xl border border-[#e7e7e9] dark:border-gray-700 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f6] flex items-center justify-center">
                  {provider.icon}
                </div>
                <div>
                  <h3 className="font-medium text-[#000000]">{provider.name}</h3>
                  <p className="text-sm text-[#6a6a6d]">{provider.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8a8a8d] bg-[#e7e7e9] px-2 py-1 rounded">
                  {provider.model}
                </span>
                <div className="w-6 h-6 rounded-full bg-[#c5fceb] flex items-center justify-center">
                  <Check className="w-4 h-4 text-[#16bb7b]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="w-full max-w-md bg-[#f5f5f6] rounded-lg p-4">
          <p className="text-sm text-[#4a4a4c] text-center">
            El modelo de transcripción se descargará automáticamente la primera vez que grabes
            (~466 MB). Tu audio nunca sale de tu computadora.
          </p>
        </div>

        {/* Continue Button */}
        <div className="w-full max-w-xs">
          <Button
            onClick={handleContinue}
            disabled={isCompleting}
            className="w-full h-11 bg-[#000000] hover:bg-[#1a1a1a] text-white"
          >
            {isCompleting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              'Continuar'
            )}
          </Button>
        </div>
      </div>
    </OnboardingContainer>
  );
}
