import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Flame, Zap, Target, Settings, ChevronRight, Timer, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FASTING_PROTOCOLS, FastingProtocol } from "@/lib/fasting";

interface FastingPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartFast: (protocol: FastingProtocol, customHours?: number) => void;
}

export const FastingPortal = ({ isOpen, onClose, onStartFast }: FastingPortalProps) => {
  const [selectedProtocol, setSelectedProtocol] = useState<FastingProtocol | null>(null);
  const [customHours, setCustomHours] = useState(16);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const handleProtocolSelect = (protocol: FastingProtocol) => {
    setSelectedProtocol(protocol);
    if (protocol.id === 'custom') {
      setStep('confirm');
    } else {
      setStep('confirm');
    }
  };

  const handleStartFast = () => {
    if (selectedProtocol) {
      const hours = selectedProtocol.id === 'custom' ? customHours : selectedProtocol.fastingHours;
      onStartFast(selectedProtocol, hours);
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedProtocol(null);
  };

  const getProtocolIcon = (protocol: FastingProtocol) => {
    switch (protocol.id) {
      case '16-8': return <Clock className="h-8 w-8" />;
      case '18-6': return <Flame className="h-8 w-8" />;
      case '20-4': return <Zap className="h-8 w-8" />;
      case '23-1': return <Target className="h-8 w-8" />;
      case 'custom': return <Settings className="h-8 w-8" />;
      default: return <Clock className="h-8 w-8" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 bottom-0 z-[100] overflow-hidden"
          style={{ touchAction: 'none', width: '100vw', height: '100vh', margin: 0, padding: 0 }}
        >
          {/* Animated background */}
          <motion.div
            initial={{ scale: 0, borderRadius: "100%" }}
            animate={{ scale: 3, borderRadius: "0%" }}
            exit={{ scale: 0, borderRadius: "100%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent origin-center"
          />
          
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 100 
                }}
                animate={{ 
                  opacity: [0, 0.6, 0],
                  y: -100,
                  x: Math.random() * window.innerWidth
                }}
                transition={{
                  duration: 4 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                  ease: "linear"
                }}
                className="absolute w-2 h-2 rounded-full bg-white/30"
              />
            ))}
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="relative h-full flex flex-col text-white overflow-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                {step === 'confirm' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                    onClick={handleBack}
                  >
                    ← Back
                  </Button>
                )}
              </motion.div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={onClose}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
              <AnimatePresence mode="wait">
                {step === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full max-w-md space-y-6"
                  >
                    <motion.div 
                      className="text-center mb-8"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <motion.div
                        animate={{ 
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="text-6xl mb-4 flex justify-center"
                      >
                        <Timer className="h-16 w-16" />
                      </motion.div>
                      <h1 className="text-4xl font-bold mb-2">Intermittent Fasting</h1>
                      <p className="text-white/80">Choose your fasting protocol</p>
                    </motion.div>

                    <div className="space-y-3">
                      {FASTING_PROTOCOLS.map((protocol, index) => (
                        <motion.button
                          key={protocol.id}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          onClick={() => handleProtocolSelect(protocol)}
                          className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 text-left group"
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-white/10 text-white">
                              {getProtocolIcon(protocol)}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-lg">{protocol.name}</div>
                              <div className="text-white/70 text-sm">{protocol.description}</div>
                              {protocol.id !== 'custom' && (
                                <div className="text-xs text-white/50 mt-1">
                                  {protocol.fastingHours}h fast · {protocol.eatingHours}h eating
                                </div>
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 'confirm' && selectedProtocol && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full max-w-md space-y-8 text-center"
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="text-8xl"
                    >
                      ⏱️
                    </motion.div>

                    <div>
                      <h2 className="text-3xl font-bold mb-2">
                        {selectedProtocol.id === 'custom' ? 'Custom Fast' : selectedProtocol.name}
                      </h2>
                      <p className="text-white/70">{selectedProtocol.description}</p>
                    </div>

                    {selectedProtocol.id === 'custom' ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4"
                      >
                        <Label className="text-white text-left block">Fasting Duration (hours)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={72}
                          value={customHours}
                          onChange={(e) => setCustomHours(parseInt(e.target.value) || 16)}
                          className="bg-white/20 border-white/30 text-white text-center text-2xl font-bold h-16"
                        />
                        <p className="text-white/60 text-sm">
                          Your fast will end at {new Date(Date.now() + customHours * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/10 backdrop-blur-sm rounded-2xl p-6"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-4xl font-bold">{selectedProtocol.fastingHours}</div>
                            <div className="text-white/60 text-sm">Hours Fasting</div>
                          </div>
                          <div>
                            <div className="text-4xl font-bold">{selectedProtocol.eatingHours}</div>
                            <div className="text-white/60 text-sm">Hours Eating</div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/20">
                          <p className="text-white/70 text-sm">
                            Fast ends at {new Date(Date.now() + selectedProtocol.fastingHours * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Button
                        onClick={handleStartFast}
                        className="w-full h-16 text-lg font-bold bg-white text-primary hover:bg-white/90 rounded-2xl"
                        size="lg"
                      >
                        <motion.span
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          Start Fasting Now
                        </motion.span>
                      </Button>
                    </motion.div>

                    <p className="text-white/50 text-xs">
                      Stay hydrated! Water, black coffee, and plain tea are allowed.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
