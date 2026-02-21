import React, { useEffect, useState } from 'react';
import { Shield, Mic, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingContainer } from '../OnboardingContainer';
import { useOnboarding } from '@/contexts/OnboardingContext';

/**
 * Setup Overview Step - Local-First Mode
 *
 * Explains that Maity uses local Whisper for transcription (privacy-first)
 * and cloud APIs for summaries. Whisper model downloads on first use.
 */
export function SetupOverviewStep() {
  const { goNext } = useOnboarding();
  const [isMac, setIsMac] = useState(false);

  // Detect platform for totalSteps
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

  const features = [
    {
      icon: <Mic className="w-5 h-5 text-[#3a4ac3]" />,
      title: 'Transcripción Local',
      description: 'Whisper - privada y sin internet',
    },
    {
      icon: <FileText className="w-5 h-5 text-[#16bb7b]" />,
      title: 'Resúmenes Inteligentes',
      description: 'Impulsado por OpenAI GPT-4o',
    },
    {
      icon: <Zap className="w-5 h-5 text-[#3a4ac3]" />,
      title: 'Privacidad Total',
      description: 'Tu audio nunca sale de tu PC',
    },
  ];

  const handleContinue = () => {
    goNext();
  };

  return (
    <OnboardingContainer
      title="Resumen de Configuración"
      description="Maity transcribe tus reuniones localmente con Whisper para máxima privacidad, y genera resúmenes inteligentes con IA en la nube."
      step={2}
      totalSteps={isMac ? 4 : 3}
    >
      <div className="flex flex-col items-center space-y-8">
        {/* Privacy Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
          <Shield className="w-10 h-10 text-[#3a4ac3]" />
        </div>

        {/* Features Card */}
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg border border-[#e7e7e9] dark:border-gray-700 p-5">
          <div className="space-y-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-2"
              >
                <div className="w-10 h-10 rounded-full bg-[#f5f5f6] flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-medium text-[#000000]">{feature.title}</h3>
                  <p className="text-sm text-[#6a6a6d]">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Download Note */}
        <div className="w-full max-w-md bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 text-center">
            El modelo de transcripción Whisper (~466 MB) se descargará automáticamente
            la primera vez que inicies una grabación.
          </p>
        </div>

        {/* CTA Section */}
        <div className="w-full max-w-xs space-y-4">
          <Button
            onClick={handleContinue}
            className="w-full h-11 bg-[#000000] hover:bg-[#1a1a1a] text-white"
          >
            ¡Vamos!
          </Button>
          <div className="text-center">
            <a
              href="https://github.com/Zackriya-Solutions/meeting-minutes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#4a4a4c] hover:underline"
            >
              Reportar problemas en GitHub
            </a>
          </div>
        </div>
      </div>
    </OnboardingContainer>
  );
}
