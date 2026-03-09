import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { logCheat } from "@/lib/storage";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FIXED_CHEAT_OPTIONS = [
  { value: 'sugary-drink', label: 'Sugary Drink/Soda', resetsStreak: true },
  { value: 'alcohol', label: 'Alcohol', resetsStreak: true },
  { value: 'peanuts', label: 'Peanuts', resetsStreak: true },
  { value: 'pizza', label: 'Pizza', resetsStreak: true },
  { value: 'pasta', label: 'Pasta & Noodles', resetsStreak: true },
  { value: 'fast-food', label: 'Fast Food', resetsStreak: true },
  { value: 'fried-food', label: 'Fried Foods', resetsStreak: true },
  { value: 'junk-food', label: 'Junk Food & Sweets', resetsStreak: true },
  { value: 'processed-meat', label: 'Processed Meat', resetsStreak: true },
  { value: 'excess-oil', label: 'Used Too Much Oil', resetsStreak: false },
  { value: 'large-portion', label: 'Ate Large Portion', resetsStreak: false },
  { value: 'skipped-meal', label: 'Skipped Planned Meal', resetsStreak: false },
  { value: 'late-eating', label: 'Ate Too Late', resetsStreak: false },
  { value: 'other', label: 'Other Violation', resetsStreak: false },
];

export const CheatLogDialog = () => {
  const [open, setOpen] = useState(false);
  const [cheatType, setCheatType] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [customItems, setCustomItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('leantrack_custom_cheat_items');
      if (stored) {
        setCustomItems(JSON.parse(stored));
      }
    } catch {}
  }, [open]);

  const allOptions = [
    ...FIXED_CHEAT_OPTIONS,
    ...customItems.map(item => ({
      value: `custom-${item.toLowerCase().replace(/\s+/g, '-')}`,
      label: item,
      resetsStreak: true,
    })),
  ];

  const resetItems = allOptions.filter(o => o.resetsStreak).map(o => o.label);

  const handleSubmit = () => {
    if (!cheatType || !description) {
      toast.error("Please fill in required fields");
      return;
    }

    const shouldReset = logCheat({
      cheatType,
      description,
      notes,
      timestamp: new Date().toISOString()
    });

    if (shouldReset) {
      toast.error("Streak reset! Major violation detected. Let's start fresh!", {
        duration: 5000
      });
    } else {
      toast.warning("Cheat logged. Stay strong and get back on track!", {
        duration: 4000
      });
    }

    setCheatType("");
    setDescription("");
    setNotes("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full">
          <AlertCircle className="h-4 w-4 mr-2" />
          I cheated
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Cheat/Violation</DialogTitle>
        </DialogHeader>
        
        <Alert variant="destructive" className="my-4">
          <AlertDescription>
            These items will reset your streak: {resetItems.join(', ')}.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cheatType">What did you do? *</Label>
            <Select value={cheatType} onValueChange={setCheatType}>
              <SelectTrigger>
                <SelectValue placeholder="Select violation type" />
              </SelectTrigger>
              <SelectContent>
                {allOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}{opt.resetsStreak ? ' (RESETS STREAK)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Details *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Had a bottle of Coke"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">How do you plan to get back on track?</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., I'll drink more water and focus on my next meal..."
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} variant="destructive" className="w-full">
            Log Violation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
