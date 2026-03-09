import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Clock, CheckCircle, XCircle, Calendar, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFastingState, FASTING_PROTOCOLS, FastingSession } from "@/lib/fasting";
import { format, parseISO } from "date-fns";

export const FastingHistoryDialog = () => {
  const [open, setOpen] = useState(false);
  const fastingState = getFastingState();
  const sessions = [...fastingState.completedSessions].reverse();

  const getProtocolName = (protocolId: string) => {
    return FASTING_PROTOCOLS.find(p => p.id === protocolId)?.name || protocolId;
  };

  const getActualDuration = (session: FastingSession) => {
    const start = new Date(session.startTime);
    const end = session.completedAt ? new Date(session.completedAt) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <History className="h-4 w-4 mr-1" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Fasting History
          </DialogTitle>
        </DialogHeader>

        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No fasts completed yet</p>
            <p className="text-sm mt-1">Start your first fast to see your history here</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 rounded-xl bg-muted">
                  <div className="text-2xl font-bold text-primary">{sessions.length}</div>
                  <div className="text-xs text-muted-foreground">Total Fasts</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(fastingState.totalFastingHours)}h
                  </div>
                  <div className="text-xs text-muted-foreground">Total Hours</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted">
                  <div className="text-2xl font-bold text-primary">
                    {sessions.filter(s => s.completed).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
              </div>

              <AnimatePresence>
                {sessions.map((session, index) => {
                  const duration = getActualDuration(session);
                  const startDate = parseISO(session.startTime);
                  const endDate = session.completedAt ? parseISO(session.completedAt) : null;

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-xl border bg-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {session.completed ? (
                            <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                          )}
                          <div>
                            <span className="font-semibold text-sm">
                              {getProtocolName(session.protocolId)}
                            </span>
                            <Badge
                              variant={session.completed ? "default" : "secondary"}
                              className="ml-2 text-[10px] px-1.5 py-0"
                            >
                              {session.completed ? "Completed" : "Ended Early"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(startDate, "MMM d, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor(duration)}h {Math.round((duration % 1) * 60)}m
                          <span className="text-muted-foreground/60">
                            / {session.targetDurationHours}h target
                          </span>
                        </div>
                      </div>

                      {session.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {session.notes}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
