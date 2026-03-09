 import { useState, useEffect } from "react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Book, Trash2, ChevronRight, Flame, Calendar } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { format, isToday, isYesterday, parseISO } from "date-fns";
 
 interface FoodEntry {
   id: string;
   photo_url: string;
   food_name: string;
   portion_size: string | null;
   calories: number;
   protein: number | null;
   carbs: number | null;
   fats: number | null;
   ai_analysis: string | null;
   notes: string | null;
   created_at: string;
 }
 
 interface FoodJournalProps {
   refreshTrigger?: number;
 }
 
 export const FoodJournal = ({ refreshTrigger }: FoodJournalProps) => {
   const [entries, setEntries] = useState<FoodEntry[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
 
   const fetchEntries = async () => {
     try {
       const { data, error } = await supabase
         .from('food_entries')
         .select('*')
         .order('created_at', { ascending: false })
         .limit(50);
 
       if (error) {
         console.error('Error fetching entries:', error);
         return;
       }
 
       setEntries(data || []);
     } catch (err) {
       console.error('Error:', err);
     } finally {
       setIsLoading(false);
     }
   };
 
   useEffect(() => {
     fetchEntries();
   }, [refreshTrigger]);
 
   useEffect(() => {
     const handleNewEntry = () => {
       fetchEntries();
     };
     window.addEventListener('foodEntryAdded', handleNewEntry);
     return () => window.removeEventListener('foodEntryAdded', handleNewEntry);
   }, []);
 
   const deleteEntry = async (id: string) => {
     try {
       const { error } = await supabase
         .from('food_entries')
         .delete()
         .eq('id', id);
 
       if (error) {
         toast.error('Failed to delete entry');
         return;
       }
 
       setEntries(prev => prev.filter(e => e.id !== id));
       setSelectedEntry(null);
       toast.success('Entry deleted');
     } catch (err) {
       console.error('Error deleting:', err);
       toast.error('Failed to delete entry');
     }
   };
 
   const formatDate = (dateStr: string) => {
     const date = parseISO(dateStr);
     if (isToday(date)) return 'Today';
     if (isYesterday(date)) return 'Yesterday';
     return format(date, 'MMM d, yyyy');
   };
 
   const formatTime = (dateStr: string) => {
     return format(parseISO(dateStr), 'h:mm a');
   };
 
   // Group entries by date
   const groupedEntries = entries.reduce((acc, entry) => {
     const dateKey = format(parseISO(entry.created_at), 'yyyy-MM-dd');
     if (!acc[dateKey]) {
       acc[dateKey] = [];
     }
     acc[dateKey].push(entry);
     return acc;
   }, {} as Record<string, FoodEntry[]>);
 
   const todayEntries = entries.filter(e => isToday(parseISO(e.created_at)));
   const todayCalories = todayEntries.reduce((sum, e) => sum + e.calories, 0);
 
   if (isLoading) {
     return (
       <Card>
         <CardHeader className="pb-3">
           <CardTitle className="flex items-center gap-2 text-lg">
             <Book className="h-5 w-5 text-primary" />
             Food Journal
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="animate-pulse space-y-3">
             <div className="h-20 bg-muted rounded-lg" />
             <div className="h-20 bg-muted rounded-lg" />
           </div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <>
       <Card>
         <CardHeader className="pb-3">
           <CardTitle className="flex items-center justify-between">
             <span className="flex items-center gap-2 text-lg">
               <Book className="h-5 w-5 text-primary" />
               Food Journal
             </span>
             {todayCalories > 0 && (
               <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                 <Flame className="h-4 w-4 text-primary" />
                 {todayCalories} kcal today
               </span>
             )}
           </CardTitle>
         </CardHeader>
         <CardContent>
           {entries.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               <Book className="h-12 w-12 mx-auto mb-3 opacity-30" />
               <p>No food photos yet</p>
               <p className="text-sm">Snap a photo to start tracking!</p>
             </div>
           ) : (
             <ScrollArea className="h-[300px] pr-2">
               <div className="space-y-4">
                 {Object.entries(groupedEntries).map(([dateKey, dateEntries]) => (
                   <div key={dateKey}>
                     <div className="flex items-center gap-2 mb-2 sticky top-0 bg-card py-1">
                       <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                       <span className="text-xs font-medium text-muted-foreground">
                         {formatDate(dateEntries[0].created_at)}
                       </span>
                     </div>
                     <div className="space-y-2">
                       {dateEntries.map((entry) => (
                         <button
                           key={entry.id}
                           onClick={() => setSelectedEntry(entry)}
                           className="w-full flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                         >
                           <img
                             src={entry.photo_url}
                             alt={entry.food_name}
                             className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                           />
                           <div className="flex-1 min-w-0">
                             <h4 className="font-medium text-sm truncate">{entry.food_name}</h4>
                             <p className="text-xs text-muted-foreground">
                               {entry.calories} kcal • {formatTime(entry.created_at)}
                             </p>
                           </div>
                           <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                         </button>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
             </ScrollArea>
           )}
         </CardContent>
       </Card>
 
       {/* Entry Detail Dialog */}
       <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
         <DialogContent className="max-w-md">
           {selectedEntry && (
             <>
               <DialogHeader>
                 <DialogTitle>{selectedEntry.food_name}</DialogTitle>
               </DialogHeader>
               <div className="space-y-4">
                 <img
                   src={selectedEntry.photo_url}
                   alt={selectedEntry.food_name}
                   className="w-full h-48 object-cover rounded-lg"
                 />
 
                 <div className="grid grid-cols-4 gap-2 text-center">
                   <div className="bg-primary/10 rounded-lg p-2">
                     <div className="text-xl font-bold text-primary">{selectedEntry.calories}</div>
                     <div className="text-xs text-muted-foreground">kcal</div>
                   </div>
                   <div className="bg-muted rounded-lg p-2">
                     <div className="text-lg font-semibold">{selectedEntry.protein || 0}g</div>
                     <div className="text-xs text-muted-foreground">Protein</div>
                   </div>
                   <div className="bg-muted rounded-lg p-2">
                     <div className="text-lg font-semibold">{selectedEntry.carbs || 0}g</div>
                     <div className="text-xs text-muted-foreground">Carbs</div>
                   </div>
                   <div className="bg-muted rounded-lg p-2">
                     <div className="text-lg font-semibold">{selectedEntry.fats || 0}g</div>
                     <div className="text-xs text-muted-foreground">Fats</div>
                   </div>
                 </div>
 
                 {selectedEntry.portion_size && (
                   <p className="text-sm text-muted-foreground">
                     Portion: {selectedEntry.portion_size}
                   </p>
                 )}
 
                 {selectedEntry.ai_analysis && (
                   <p className="text-sm text-muted-foreground italic">
                     {selectedEntry.ai_analysis}
                   </p>
                 )}
 
                 {selectedEntry.notes && (
                   <div className="bg-muted/50 rounded-lg p-3">
                     <p className="text-sm">{selectedEntry.notes}</p>
                   </div>
                 )}
 
                 <p className="text-xs text-muted-foreground">
                   {format(parseISO(selectedEntry.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
                 </p>
 
                 <Button
                   variant="destructive"
                   size="sm"
                   className="w-full"
                   onClick={() => deleteEntry(selectedEntry.id)}
                 >
                   <Trash2 className="h-4 w-4 mr-2" />
                   Delete Entry
                 </Button>
               </div>
             </>
           )}
         </DialogContent>
       </Dialog>
     </>
   );
 };