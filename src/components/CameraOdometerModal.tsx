import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  X, 
  RotateCw, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Upload, 
  RefreshCw, 
  Volume2, 
  Eye, 
  Lock, 
  ArrowRight,
  Zap,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { RefectorySector, TurnstileCountItem } from '../types';
import { getSectorForTurnstile } from '../utils/sectors';

interface CameraOdometerModalProps {
  isOpen: boolean;
  onClose: () => void;
  turnstile: TurnstileCountItem;
  targetField: 'initial' | 'final';
  onApplyReading: (turnstileNumber: number, field: 'initial' | 'final', value: number, photoBase64?: string) => void;
  allTurnstiles?: TurnstileCountItem[];
  onSelectTurnstile?: (turnstile: TurnstileCountItem) => void;
}

export function CameraOdometerModal({
  isOpen,
  onClose,
  turnstile,
  targetField: defaultTargetField,
  onApplyReading,
  allTurnstiles = [],
  onSelectTurnstile,
}: CameraOdometerModalProps) {
  const [activeTurnstile, setActiveTurnstile] = useState<TurnstileCountItem>(turnstile);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [advanceSpeed, setAdvanceSpeed] = useState<'turbo' | 'instant'>('turbo');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [transitionBanner, setTransitionBanner] = useState<{
    message: string;
    turnstileCode: string;
  } | null>(null);

  const [targetField, setTargetField] = useState<'initial' | 'final'>(defaultTargetField);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    odometerNumber: number | null;
    rawText: string;
    confidence: 'high' | 'medium' | 'low' | 'manual_review';
    notes: string;
  } | null>(null);
  const [editableValue, setEditableValue] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lista de catracas para navegação sequencial (padrão: 1 a 14)
  const turnstilesList = allTurnstiles.length > 0 ? allTurnstiles : [activeTurnstile];
  const currentIndex = turnstilesList.findIndex(t => t.turnstileNumber === activeTurnstile.turnstileNumber);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < turnstilesList.length - 1;
  const nextTurnstile = hasNext ? turnstilesList[currentIndex + 1] : null;
  const prevTurnstile = hasPrev ? turnstilesList[currentIndex - 1] : null;

  const sectorInfo = getSectorForTurnstile(activeTurnstile.turnstileNumber);

  // Sincroniza catraca se o componente pai alterar
  useEffect(() => {
    if (turnstile && turnstile.turnstileNumber !== activeTurnstile.turnstileNumber) {
      setActiveTurnstile(turnstile);
    }
  }, [turnstile]);

  // Garante que o stream de vídeo seja reanexado ao elemento <video> assim que a foto capturada for removida
  useEffect(() => {
    if (videoRef.current && cameraStream && !capturedImage) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream, capturedImage, activeTurnstile]);

  // Timer de contagem regressiva para avanço automático para a próxima catraca
  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      setCountdown(null);
      handleConfirm(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, editableValue, nextTurnstile]);

  // Som suave de confirmação via Web Audio API
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Ignora restrições de áudio do navegador
    }
  };

  useEffect(() => {
    setTargetField(defaultTargetField);
  }, [defaultTargetField]);

  // Inicializa câmera ao abrir o modal
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setOcrResult(null);
      setEditableValue('');
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sem suporte direto à API de câmera. Você pode enviar a foto pela galeria.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Verifica lanterna / flash
      const track = stream.getVideoTracks()[0];
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn('Erro ao acessar câmera do celular:', err);
      setCameraError(err.message || 'Não foi possível acessar a câmera do aparelho. Conceda permissão no navegador ou utilize o upload de foto.');
    }
  };

  const toggleTorch = async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.error('Falha ao acionar flash da câmera:', e);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Alterna imediatamente para outra catraca (com reinício de câmera instantâneo)
  const switchToTurnstile = (target: TurnstileCountItem) => {
    setCountdown(null);
    setCapturedImage(null);
    setOcrResult(null);
    setEditableValue('');
    setCameraError(null);
    setActiveTurnstile(target);
    onSelectTurnstile?.(target);

    setTransitionBanner({
      message: `Catraca registrada! Câmera aberta: ${target.turnstileCode} - ${target.turnstileName}`,
      turnstileCode: target.turnstileCode,
    });
    setTimeout(() => setTransitionBanner(null), 3500);

    // Se o stream já estiver ativo, reanexa o elemento de vídeo imediatamente
    if (cameraStream && cameraStream.getVideoTracks().some(t => t.readyState === 'live')) {
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = cameraStream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } else {
      setTimeout(() => {
        startCamera();
      }, 80);
    }
  };

  // Capturar foto a partir do elemento de vídeo otimizada para OCR ultra-rápido
  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const srcW = video.videoWidth || 1280;
    const srcH = video.videoHeight || 720;
    
    // Redimensionamento inteligente para max 840px: acelera o upload e inferência sem perder nitidez dos dígitos
    const maxDim = 840;
    let targetW = srcW;
    let targetH = srcH;
    if (srcW > maxDim || srcH > maxDim) {
      if (srcW > srcH) {
        targetW = maxDim;
        targetH = Math.round((srcH * maxDim) / srcW);
      } else {
        targetH = maxDim;
        targetW = Math.round((srcW * maxDim) / srcH);
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.80);

    setCapturedImage(dataUrl);
    playBeep();

    await processOcr(dataUrl);
  };

  // Envio de foto da galeria ou câmera nativa do celular (com redimensionamento rápido)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const rawDataUrl = evt.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 840;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.80);
          setCapturedImage(optimizedDataUrl);
          playBeep();
          processOcr(optimizedDataUrl);
        } else {
          setCapturedImage(rawDataUrl);
          playBeep();
          processOcr(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Processa OCR chamando o endpoint do servidor Gemini em alta velocidade
  const processOcr = async (imageBase64: string) => {
    setIsProcessing(true);
    setOcrResult(null);
    setCountdown(null);

    try {
      const response = await fetch('/api/ocr-odometer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: 'image/jpeg',
          turnstileInfo: `${activeTurnstile.turnstileCode} - ${activeTurnstile.turnstileName} (${sectorInfo.name})`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API (${response.status})`);
      }

      const data = await response.json();
      
      setOcrResult({
        odometerNumber: data.odometerNumber,
        rawText: data.rawText || '',
        confidence: data.confidence || 'medium',
        notes: data.notes || 'Hodômetro analisado.',
      });

      if (data.odometerNumber !== null && data.odometerNumber !== undefined) {
        const numVal = Number(data.odometerNumber);
        setEditableValue(String(numVal));

        // Salvamento mais rápido: se estiver no modo instantâneo, salva imediatamente em 0s
        if (autoAdvance) {
          if (advanceSpeed === 'instant') {
            setTimeout(() => {
              handleConfirm(true, numVal);
            }, 60);
          } else {
            // Modo Turbo: contagem de apenas 1 segundo para conferência visual rápida
            setCountdown(1);
          }
        }
      } else {
        // Se a IA não tiver certeza, inicializa com o valor atual para facilitar o ajuste manual
        setEditableValue(targetField === 'initial' ? String(activeTurnstile.initialCount || '') : String(activeTurnstile.finalCount || ''));
        setCountdown(null);
      }
    } catch (err: any) {
      console.error('Falha ao processar OCR do hodômetro:', err);
      setOcrResult({
        odometerNumber: null,
        rawText: '',
        confidence: 'manual_review',
        notes: 'Verifique a foto e digite os números do mostrador mecânico manualmente abaixo.',
      });
      setEditableValue(targetField === 'initial' ? String(activeTurnstile.initialCount || '') : String(activeTurnstile.finalCount || ''));
      setCountdown(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCountdown(null);
    setCapturedImage(null);
    setOcrResult(null);
    setEditableValue('');
    if (cameraStream && cameraStream.getVideoTracks().some(t => t.readyState === 'live')) {
      if (videoRef.current) {
        videoRef.current.srcObject = cameraStream;
        videoRef.current.play().catch(() => {});
      }
    } else {
      startCamera();
    }
  };

  // Confirmação da leitura com salvamento ultra-rápido e avanço automático
  const handleConfirm = (forceAdvance?: boolean, overrideValue?: number) => {
    setCountdown(null);
    const numericValue = overrideValue !== undefined 
      ? overrideValue 
      : parseInt(editableValue.replace(/\D/g, ''), 10);
    if (isNaN(numericValue)) return;

    onApplyReading(
      activeTurnstile.turnstileNumber,
      targetField,
      numericValue,
      capturedImage || undefined
    );
    playBeep();

    const willAdvance = forceAdvance !== undefined ? forceAdvance : autoAdvance;

    if (willAdvance && nextTurnstile) {
      // Avança imediatamente para a próxima catraca mantendo a câmera aberta
      switchToTurnstile(nextTurnstile);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div 
        id="camera-odometer-modal"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Top Header com Navegação Entre Catracas */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/70 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  {activeTurnstile.turnstileCode}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sectorInfo.color.badge}`}>
                  {sectorInfo.shortName}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                  {currentIndex + 1} de {turnstilesList.length}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                {activeTurnstile.turnstileName}
              </h3>
            </div>
          </div>

          {/* Controles de Navegação Rápida entre Catracas */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => prevTurnstile && switchToTurnstile(prevTurnstile)}
              disabled={!hasPrev}
              title={hasPrev ? `Ir para Catraca anterior (${prevTurnstile?.turnstileCode})` : 'Primeira catraca'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => nextTurnstile && switchToTurnstile(nextTurnstile)}
              disabled={!hasNext}
              title={hasNext ? `Ir para próxima Catraca (${nextTurnstile?.turnstileCode})` : 'Última catraca'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              id="btn-close-camera-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Destino e Toggle de Avanço Automático */}
        <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          {/* Destino: Inicial ou Final */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-[11px] font-medium text-slate-400 mr-1">Campo:</span>
            <div className="flex items-center space-x-1 p-0.5 bg-slate-900 rounded-lg border border-slate-700/60">
              <button
                id="radio-target-initial"
                type="button"
                onClick={() => setTargetField('initial')}
                className={`px-2.5 py-0.5 rounded font-semibold text-[11px] transition-all ${
                  targetField === 'initial'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Inicial
              </button>
              <button
                id="radio-target-final"
                type="button"
                onClick={() => setTargetField('final')}
                className={`px-2.5 py-0.5 rounded font-semibold text-[11px] transition-all ${
                  targetField === 'final'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Final
              </button>
            </div>
          </div>

          {/* Seletor de Velocidade e Toggle de Avanço Automático */}
          <div className="flex flex-wrap items-center gap-1.5">
            {autoAdvance && (
              <div className="flex items-center space-x-1 p-0.5 bg-slate-900 rounded-lg border border-slate-750 text-[10px]">
                <button
                  id="btn-speed-turbo"
                  type="button"
                  onClick={() => setAdvanceSpeed('turbo')}
                  className={`px-2 py-0.5 rounded font-bold transition-all flex items-center space-x-1 ${
                    advanceSpeed === 'turbo'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Salva em 1 segundo (permite conferência visual rápida)"
                >
                  <Zap className="w-3 h-3 text-cyan-200" />
                  <span>Rápido (1s)</span>
                </button>
                <button
                  id="btn-speed-instant"
                  type="button"
                  onClick={() => setAdvanceSpeed('instant')}
                  className={`px-2 py-0.5 rounded font-bold transition-all flex items-center space-x-1 ${
                    advanceSpeed === 'instant'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Salva e avança imediatamente em 0s assim que o número for lido"
                >
                  <Sparkles className="w-3 h-3 text-emerald-200" />
                  <span>Instantâneo (0s)</span>
                </button>
              </div>
            )}

            {/* Toggle de Avanço Automático para a Próxima Catraca */}
            <button
              id="btn-toggle-auto-advance"
              type="button"
              onClick={() => setAutoAdvance(prev => !prev)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                autoAdvance 
                  ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Ao fotografar ou confirmar, a câmera abre automaticamente para a próxima catraca em sequência"
            >
              <ArrowRight className={`w-3.5 h-3.5 ${autoAdvance ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>Avanço Catraca: <strong>{autoAdvance ? 'ATIVADO' : 'MANUAL'}</strong></span>
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[260px] max-h-[400px] overflow-hidden">
          {/* Banner de Transição entre Catracas */}
          {transitionBanner && (
            <div className="absolute top-3 left-3 right-3 z-30 bg-emerald-950/95 border border-emerald-400 text-white px-3 py-2 rounded-xl shadow-xl backdrop-blur-md flex items-center justify-between animate-pulse">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-bold text-emerald-200">{transitionBanner.message}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900 border border-emerald-600 text-emerald-100 font-bold">
                PRÓXIMA
              </span>
            </div>
          )}

          {!capturedImage ? (
            <>
              {cameraError ? (
                <div className="p-6 text-center max-w-sm">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 mb-4">{cameraError}</p>
                  <div className="flex flex-col gap-2">
                    <button
                      id="btn-retry-camera"
                      onClick={startCamera}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                    >
                      Tentar Câmera Novamente
                    </button>
                    <button
                      id="btn-upload-fallback"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Tirar Foto pelo Celular / Galeria</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Espaço Destinado para Enquadramento dos Dígitos */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div 
                      id="viewfinder-digit-framing-box"
                      className="relative w-72 sm:w-80 h-32 sm:h-36 rounded-2xl transition-all duration-300 flex items-center justify-center overflow-hidden border-2 border-cyan-400/85 shadow-[0_0_25px_rgba(6,182,212,0.4)] bg-slate-950/15"
                    >
                      {/* Corner markers */}
                      <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-white" />
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-white" />
                      <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-white" />
                      <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-white" />

                      {/* Animated scanline */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />

                      <div className="flex flex-col items-center space-y-1 px-3 text-center">
                        <span className="text-[11px] font-mono font-bold text-cyan-200 bg-slate-950/80 px-2.5 py-1 rounded-md border border-cyan-500/40 shadow-sm">
                          {activeTurnstile.turnstileCode}: Enquadre os dígitos aqui
                        </span>
                        <span className="text-[10px] text-slate-300/80">
                          Posicione os números do mostrador mecânico
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] text-slate-200 font-medium bg-slate-950/85 px-3.5 py-1 rounded-full border border-slate-700/60 backdrop-blur-sm shadow-md text-center max-w-[340px]">
                      Aponte para o visor da {activeTurnstile.turnstileCode} e toque em <strong>Fotografar</strong>
                    </p>
                  </div>

                  {/* Camera Control Overlays */}
                  <div className="absolute top-3 right-3 flex items-center space-x-2">
                    {hasTorch && (
                      <button
                        id="btn-toggle-torch"
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                          torchOn ? 'bg-amber-500 text-slate-950' : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
                        }`}
                        title="Lanterna / Flash"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      id="btn-switch-camera"
                      type="button"
                      onClick={switchCamera}
                      className="p-2 rounded-full bg-slate-900/70 hover:bg-slate-800 text-slate-200 backdrop-blur-md transition-colors"
                      title="Alternar Câmera"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              <img
                src={capturedImage}
                alt="Hodômetro capturado"
                className="max-h-[360px] w-full object-contain"
              />

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mb-3" />
                  <div className="flex items-center space-x-1.5 text-cyan-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>Lendo dígitos do hodômetro com IA...</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Identificando numeração da {activeTurnstile.turnstileCode}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden Canvas and File Input */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Rodapé / Botões de Ação */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          {!capturedImage ? (
            <div className="flex items-center space-x-2">
              <button
                id="btn-gallery-upload"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Galeria</span>
              </button>

              <button
                id="btn-capture-photo"
                type="button"
                onClick={capturePhoto}
                disabled={Boolean(cameraError)}
                className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/40 transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Fotografar {activeTurnstile.turnstileCode}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* OCR Extracted Result Box */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Hodômetro Identificado ({activeTurnstile.turnstileCode}):</span>
                  </div>

                  {ocrResult && (
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                      ocrResult.confidence === 'high'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                        : ocrResult.confidence === 'medium'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-700/60'
                        : 'bg-amber-950 text-amber-300 border-amber-700/60'
                    }`}>
                      {ocrResult.confidence === 'high' ? 'Alta Precisão' : ocrResult.confidence === 'medium' ? 'Leitura Efetuada' : 'Ajuste Manual'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="input-ocr-detected-number"
                    type="number"
                    value={editableValue}
                    onChange={(e) => {
                      setCountdown(null);
                      setEditableValue(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirm(true);
                      }
                    }}
                    placeholder="Ex: 14920"
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-cyan-500/50 rounded-lg text-lg font-mono font-bold text-cyan-300 tracking-wider focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <div className="text-right flex-shrink-0">
                    <span className="text-[9px] text-slate-400 uppercase font-mono block">Destino</span>
                    <span className={`text-xs font-bold ${targetField === 'initial' ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {targetField === 'initial' ? 'Inicial' : 'Final'}
                    </span>
                  </div>
                </div>

                {ocrResult?.notes && (
                  <p className="text-[10px] text-slate-400 italic">
                    {ocrResult.notes}
                  </p>
                )}
              </div>

              {/* Banner de Avanço Automático com Contagem Regressiva */}
              {countdown !== null && (
                <div className="bg-emerald-950/90 border border-emerald-500/80 rounded-xl p-2.5 flex items-center justify-between text-xs animate-fade-in shadow-lg shadow-emerald-950/50">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black font-mono flex items-center justify-center text-xs flex-shrink-0 animate-pulse">
                      {countdown}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-emerald-200 text-xs truncate">
                        {nextTurnstile ? `Avançando para ${nextTurnstile.turnstileCode} em ${countdown}s...` : `Concluindo em ${countdown}s...`}
                      </p>
                      <p className="text-[10px] text-emerald-300/80 truncate">
                        A câmera abrirá automaticamente para a próxima catraca
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => setCountdown(null)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-600 transition-colors"
                      title="Pausar contagem para editar número manualmente"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCountdown(null);
                        handleConfirm(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center space-x-1 shadow transition-all active:scale-95"
                    >
                      <span>Avançar Já</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Botões de Ação com Abertura Automática para a Próxima Catraca */}
              <div className="flex items-center space-x-2">
                <button
                  id="btn-retake-photo"
                  type="button"
                  onClick={handleRetake}
                  className="px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refazer</span>
                </button>

                {/* Se existir próxima catraca, botão principal avança e abre automaticamente */}
                {nextTurnstile ? (
                  <>
                    <button
                      id="btn-confirm-and-next"
                      type="button"
                      onClick={() => handleConfirm(true)}
                      disabled={!editableValue || isNaN(parseInt(editableValue, 10))}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950 transition-all active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Salvar e Abrir {nextTurnstile.turnstileCode} ➔</span>
                    </button>

                    <button
                      id="btn-confirm-and-close"
                      type="button"
                      onClick={() => handleConfirm(false)}
                      disabled={!editableValue || isNaN(parseInt(editableValue, 10))}
                      className="px-2.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center transition-colors"
                      title="Salvar apenas esta catraca e fechar"
                    >
                      <span>Salvar e Fechar</span>
                    </button>
                  </>
                ) : (
                  <button
                    id="btn-confirm-ocr-value"
                    type="button"
                    onClick={() => handleConfirm(false)}
                    disabled={!editableValue || isNaN(parseInt(editableValue, 10))}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950 transition-all active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Concluir Todas as {turnstilesList.length} Catracas ✓</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
