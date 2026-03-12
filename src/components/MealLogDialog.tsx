import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Camera, Upload, Loader2, Sparkles, Pencil, AlertTriangle } from "lucide-react";
import { logAlternativeMeal, markMealComplete, logCheat } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Violation keywords that should reset streak
const VIOLATION_KEYWORDS = {
  'sugary-drink': ['soda', 'coca-cola', 'coke', 'pepsi', 'fanta', 'sprite', 'mountain dew', 'energy drink', 'red bull', 'monster', 'sugary drink', 'soft drink', 'sweetened beverage', 'juice box', 'fruit punch', 'lemonade', 'sweet tea', 'iced tea sweetened', 'milkshake', 'frappe', 'frappuccino', 'smoothie king', 'slurpee', 'icee'],
  'alcohol': ['beer', 'wine', 'vodka', 'whiskey', 'whisky', 'rum', 'gin', 'tequila', 'brandy', 'cognac', 'liquor', 'cocktail', 'margarita', 'mojito', 'champagne', 'alcohol', 'alcoholic', 'lager', 'ale', 'stout', 'bourbon', 'scotch', 'sake', 'soju', 'prosecco', 'sangria', 'daiquiri', 'martini', 'mimosa'],
  'bread': ['bread', 'toast', 'baguette', 'croissant', 'bagel', 'roll', 'bun', 'loaf', 'sandwich bread', 'white bread', 'wheat bread', 'sourdough', 'pita', 'naan', 'flatbread', 'brioche', 'ciabatta', 'focaccia', 'pretzel', 'tortilla wrap'],
  'peanuts': ['peanut', 'peanuts', 'groundnut', 'groundnuts', 'peanut butter'],
  'pizza': ['pizza', 'pepperoni pizza', 'cheese pizza', 'margherita', 'calzone', 'pizza slice', 'dominos', 'pizza hut', 'papa johns', 'little caesars'],
  'pasta': ['pasta', 'spaghetti', 'penne', 'fettuccine', 'lasagna', 'lasagne', 'macaroni', 'mac and cheese', 'ravioli', 'tortellini', 'linguine', 'rigatoni', 'carbonara', 'alfredo', 'bolognese', 'noodles', 'ramen', 'udon', 'lo mein', 'chow mein', 'pad thai'],
  'fast-food': ['mcdonalds', 'burger king', 'wendys', 'kfc', 'kentucky fried', 'taco bell', 'chick-fil-a', 'popeyes', 'arbys', 'sonic', 'jack in the box', 'five guys', 'in-n-out', 'shake shack', 'chipotle burrito', 'subway sandwich', 'jimmy johns'],
  'fried-food': ['fried chicken', 'french fries', 'fries', 'onion rings', 'fried fish', 'fish and chips', 'fried shrimp', 'chicken nuggets', 'chicken strips', 'chicken tenders', 'corn dog', 'fried oreo', 'fried food', 'deep fried', 'crispy fried'],
  'junk-food': ['chips', 'potato chips', 'doritos', 'cheetos', 'nachos', 'candy', 'chocolate bar', 'gummy', 'skittles', 'snickers', 'twix', 'kit kat', 'oreo cookies', 'cookies', 'cake', 'cupcake', 'brownie', 'donut', 'doughnut', 'ice cream', 'gelato', 'pastry', 'danish', 'muffin', 'cinnamon roll', 'pop tart'],
  'processed-meat': ['hot dog', 'hotdog', 'sausage', 'bacon', 'salami', 'pepperoni', 'bologna', 'spam', 'corned beef', 'deli meat', 'processed meat'],
};

interface FoodAnalysis {
  food_name: string;
  portion_size: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  description: string;
  confidence: string;
}

interface MealLogDialogProps {
  mealId: string;
  onAlternativeLogged?: () => void;
}

export const MealLogDialog = ({ mealId, onAlternativeLogged }: MealLogDialogProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'choose' | 'manual' | 'photo'>('choose');
  const [foodName, setFoodName] = useState("");
  const [foodType, setFoodType] = useState("");
  const [portion, setPortion] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [notes, setNotes] = useState("");
  
  // Photo analysis state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [detectedViolation, setDetectedViolation] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isSavingToJournal, setIsSavingToJournal] = useState(false);

  const resetForm = () => {
    setMode('choose');
    setFoodName("");
    setFoodType("");
    setPortion("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFats("");
    setNotes("");
    setImagePreview(null);
    setAnalysis(null);
    setDetectedViolation(null);
  };

  // Check if food name contains violation keywords
  const checkForViolation = (name: string, description?: string): string | null => {
    const textToCheck = (name + ' ' + (description || '')).toLowerCase();
    
    for (const [violationType, keywords] of Object.entries(VIOLATION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (textToCheck.includes(keyword.toLowerCase())) {
          return violationType;
        }
      }
    }
    return null;
  };

  // Get human-readable violation name
  const getViolationLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'sugary-drink': 'Sugary Drink',
      'alcohol': 'Alcohol',
      'bread': 'Bread',
      'peanuts': 'Peanuts',
      'pizza': 'Pizza',
      'pasta': 'Pasta/Noodles',
      'fast-food': 'Fast Food',
      'fried-food': 'Fried Food',
      'junk-food': 'Junk Food/Sweets',
      'processed-meat': 'Processed Meat',
    };
    return labels[type] || type;
  };

  // Handle food name change and check for violations
  const handleFoodNameChange = (value: string) => {
    setFoodName(value);
    const violation = checkForViolation(value);
    setDetectedViolation(violation);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { imageBase64: imagePreview }
      });

      if (error) {
        console.error('Analysis error:', error);
        toast.error('Failed to analyze image');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAnalysis(data);
      // Pre-fill form with analysis results
      setFoodName(data.food_name);
      setPortion(data.portion_size);
      setCalories(data.calories.toString());
      setProtein(data.protein.toString());
      setCarbs(data.carbs.toString());
      setFats(data.fats.toString());
      setFoodType(detectFoodType(data.food_name, data.description));
      
      // Check for violations in AI analysis
      const violation = checkForViolation(data.food_name, data.description);
      setDetectedViolation(violation);
      
      if (violation) {
        toast.warning(`Violation detected: ${getViolationLabel(violation)}! This will reset your streak.`, { duration: 5000 });
      } else {
        toast.success('Food analyzed! Review and confirm below');
      }
    } catch (err) {
      console.error('Error analyzing food:', err);
      toast.error('Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const detectFoodType = (name: string, description: string): string => {
    const text = (name + ' ' + description).toLowerCase();
    if (text.includes('fruit') || text.includes('apple') || text.includes('banana') || text.includes('orange')) return 'fruit';
    if (text.includes('vegetable') || text.includes('salad') || text.includes('broccoli')) return 'vegetable';
    if (text.includes('chicken') || text.includes('beef') || text.includes('fish') || text.includes('egg') || text.includes('meat') || text.includes('protein')) return 'protein';
    if (text.includes('rice') || text.includes('bread') || text.includes('pasta') || text.includes('noodle') || text.includes('grain')) return 'grain';
    if (text.includes('drink') || text.includes('juice') || text.includes('water') || text.includes('coffee') || text.includes('tea')) return 'beverage';
    return 'other';
  };

  const saveToFoodJournal = async () => {
    if (!analysis || !imagePreview) return;
    setIsSavingToJournal(true);
    try {
      const fileName = `food_${Date.now()}.jpg`;
      const base64Data = imagePreview.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const { error: uploadError } = await supabase.storage
        .from('food-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to save photo');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('food-photos')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('food_entries')
        .insert({
          photo_url: urlData.publicUrl,
          food_name: analysis.food_name,
          portion_size: analysis.portion_size,
          calories: analysis.calories,
          protein: analysis.protein,
          carbs: analysis.carbs,
          fats: analysis.fats,
          ai_analysis: analysis.description,
          notes: notes || null,
          meal_type: 'meal',
          device_id: localStorage.getItem('leantrack_device_id') || 'unknown'
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        toast.error('Failed to save to food journal');
        return;
      }

      toast.success('Saved to Food Journal! 📸');
      window.dispatchEvent(new CustomEvent('foodEntryAdded'));
    } catch (err) {
      console.error('Error saving to food journal:', err);
      toast.error('Failed to save to food journal');
    } finally {
      setIsSavingToJournal(false);
    }
  };

  const handleSubmit = async () => {
    if (!foodName || !foodType) {
      toast.error("Please fill in required fields");
      return;
    }

    // Check for violation one more time before submitting
    const violation = checkForViolation(foodName, notes);

    // If it's a violation, log it as a cheat instead of a meal
    if (violation) {
      const shouldReset = logCheat({
        cheatType: violation,
        description: foodName,
        notes: notes || `Logged via meal entry. Portion: ${portion || 'not specified'}`,
        timestamp: new Date().toISOString()
      });

      if (shouldReset) {
        toast.error("Streak reset! Violation detected. Let's start fresh!", {
          duration: 5000
        });
      } else {
        toast.warning("Cheat logged. Stay strong and get back on track!", {
          duration: 4000
        });
      }

      resetForm();
      setOpen(false);
      onAlternativeLogged?.();
      return;
    }

    // If we have a photo, upload it first
    let photoUrl: string | undefined;
    if (imagePreview) {
      try {
        const fileName = `meal_${mealId}_${Date.now()}.jpg`;
        const base64Data = imagePreview.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('food-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('food-photos')
            .getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      } catch (err) {
        console.error('Photo upload error:', err);
        // Continue without photo
      }
    }

    logAlternativeMeal({
      mealId,
      foodName,
      foodType,
      portion,
      calories: calories ? parseInt(calories) : undefined,
      protein: protein ? parseInt(protein) : undefined,
      carbs: carbs ? parseInt(carbs) : undefined,
      fats: fats ? parseInt(fats) : undefined,
      notes,
      timestamp: new Date().toISOString(),
      photoUrl,
    });

    // Also mark the meal as complete
    markMealComplete(mealId);

    toast.success("Alternative meal logged!");
    
    resetForm();
    setOpen(false);
    
    onAlternativeLogged?.();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          I ate something else
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Alternative Meal</DialogTitle>
        </DialogHeader>
        
        {mode === 'choose' && (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              How would you like to log your meal?
            </p>
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-2"
              onClick={() => setMode('photo')}
            >
              <div className="flex items-center gap-2">
                <Camera className="h-6 w-6 text-primary" />
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span>Take Photo (AI Analysis)</span>
            </Button>
            <Button
              variant="outline"
              className="w-full h-16 flex-col gap-2"
              onClick={() => setMode('manual')}
            >
              <Pencil className="h-5 w-5 text-muted-foreground" />
              <span>Enter Manually</span>
            </Button>
          </div>
        )}

        {mode === 'photo' && (
          <div className="space-y-4 py-4">
            {!imagePreview ? (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-24 flex-col gap-2 border-dashed"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span>Take Photo</span>
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                <Button
                  variant="outline"
                  className="w-full h-16 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span>Upload from Gallery</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                
                <Button variant="ghost" size="sm" onClick={() => setMode('choose')} className="w-full">
                  ← Back
                </Button>
              </div>
            ) : (
              <>
                <div className="relative rounded-lg overflow-hidden bg-muted">
                  <img
                    src={imagePreview}
                    alt="Food preview"
                    className="w-full h-40 object-cover"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImagePreview(null);
                      setAnalysis(null);
                    }}
                  >
                    Change
                  </Button>
                </div>

                {!analysis && (
                  <Button
                    onClick={analyzeImage}
                    disabled={isAnalyzing}
                    className="w-full gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Analyze with AI
                      </>
                    )}
                  </Button>
                )}

                {analysis && (
                  <div className="bg-primary/10 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-sm">AI Detection</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        analysis.confidence === 'high' ? 'bg-green-500/20 text-green-600' :
                        analysis.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {analysis.confidence}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-background rounded p-1.5">
                        <div className="font-bold text-primary">{analysis.calories}</div>
                        <div className="text-muted-foreground">kcal</div>
                      </div>
                      <div className="bg-background rounded p-1.5">
                        <div className="font-semibold">{analysis.protein}g</div>
                        <div className="text-muted-foreground">Protein</div>
                      </div>
                      <div className="bg-background rounded p-1.5">
                        <div className="font-semibold">{analysis.carbs}g</div>
                        <div className="text-muted-foreground">Carbs</div>
                      </div>
                      <div className="bg-background rounded p-1.5">
                        <div className="font-semibold">{analysis.fats}g</div>
                        <div className="text-muted-foreground">Fats</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {(mode === 'manual' || (mode === 'photo' && analysis)) && (
          <div className="space-y-4 py-2">
            {mode === 'manual' && (
              <Button variant="ghost" size="sm" onClick={() => setMode('choose')} className="mb-2">
                ← Back
              </Button>
            )}
            
            {detectedViolation && (
              <Alert variant="destructive" className="mb-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{getViolationLabel(detectedViolation)}</strong> detected! 
                  This will be logged as a violation and <strong>reset your streak</strong>.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="foodName">What did you eat? *</Label>
              <Input
                id="foodName"
                value={foodName}
                onChange={(e) => handleFoodNameChange(e.target.value)}
                placeholder="e.g., Grilled chicken salad"
                className={detectedViolation ? "border-destructive" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foodType">Food Type *</Label>
              <Select value={foodType} onValueChange={setFoodType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fruit">Fruit</SelectItem>
                  <SelectItem value="vegetable">Vegetable</SelectItem>
                  <SelectItem value="protein">Protein (Meat/Fish/Eggs)</SelectItem>
                  <SelectItem value="grain">Grain/Carbs</SelectItem>
                  <SelectItem value="beverage">Beverage</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portion">Portion Size</Label>
              <Input
                id="portion"
                value={portion}
                onChange={(e) => setPortion(e.target.value)}
                placeholder="e.g., 1 plate, 2 cups"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="350"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fats">Fats (g)</Label>
                <Input
                  id="fats"
                  type="number"
                  value={fats}
                  onChange={(e) => setFats(e.target.value)}
                  placeholder="15"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={2}
              />
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full"
              variant={detectedViolation ? "destructive" : "default"}
            >
              {detectedViolation ? `Log Violation (Resets Streak)` : 'Log Meal'}
            </Button>

            {mode === 'photo' && analysis && imagePreview && !detectedViolation && (
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={isSavingToJournal}
                onClick={saveToFoodJournal}
              >
                {isSavingToJournal ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving to Journal...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Also Save to Food Journal
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
