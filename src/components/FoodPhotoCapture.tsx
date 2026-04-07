 import { useState, useRef } from "react";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Camera, Upload, Loader2, Sparkles } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { getDeviceId } from "@/lib/push-notifications";
 import { toast } from "sonner";
 
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
 
 interface FoodPhotoCaptureProps {
   onFoodLogged?: () => void;
 }
 
 export const FoodPhotoCapture = ({ onFoodLogged }: FoodPhotoCaptureProps) => {
   const [open, setOpen] = useState(false);
   const [imagePreview, setImagePreview] = useState<string | null>(null);
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
   const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
   const [notes, setNotes] = useState("");
   const fileInputRef = useRef<HTMLInputElement>(null);
   const cameraInputRef = useRef<HTMLInputElement>(null);
 
   const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     // Create preview
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
       toast.success('Food analyzed successfully!');
     } catch (err) {
       console.error('Error analyzing food:', err);
       toast.error('Failed to analyze image');
     } finally {
       setIsAnalyzing(false);
     }
   };
 
   const saveFoodEntry = async () => {
     if (!analysis || !imagePreview) return;
 
     setIsSaving(true);
    try {
      // Upload image to storage with validation
      const fileName = `food_${Date.now()}.jpg`;
      const base64Data = imagePreview.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      // Validate file size (max 10MB)
      if (byteArray.length > 10 * 1024 * 1024) {
        toast.error('Image too large. Maximum size is 10MB.');
        return;
      }

      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('food-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to save photo');
        return;
      }
 
       // Get public URL
       const { data: urlData } = supabase.storage
         .from('food-photos')
         .getPublicUrl(fileName);
 
       // Save entry to database
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
           device_id: getDeviceId()
         });
 
       if (insertError) {
         console.error('Insert error:', insertError);
         toast.error('Failed to save food entry');
         return;
       }
 
       toast.success('Food entry saved!');
       resetForm();
       setOpen(false);
       onFoodLogged?.();
       window.dispatchEvent(new CustomEvent('foodEntryAdded'));
     } catch (err) {
       console.error('Error saving food entry:', err);
       toast.error('Failed to save food entry');
     } finally {
       setIsSaving(false);
     }
   };
 
   const resetForm = () => {
     setImagePreview(null);
     setAnalysis(null);
     setNotes("");
   };
 
   return (
     <Dialog open={open} onOpenChange={(isOpen) => {
       setOpen(isOpen);
       if (!isOpen) resetForm();
     }}>
       <DialogTrigger asChild>
         <Button className="w-full gap-2" size="lg">
           <Camera className="h-5 w-5" />
           Snap & Log Food
         </Button>
       </DialogTrigger>
       <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Sparkles className="h-5 w-5 text-primary" />
             AI Food Scanner
           </DialogTitle>
         </DialogHeader>
 
         <div className="space-y-4 py-4">
           {!imagePreview ? (
             <div className="space-y-3">
               <Button
                 variant="outline"
                 className="w-full h-32 flex-col gap-2 border-dashed"
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
                 className="w-full h-20 flex-col gap-2"
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
             </div>
           ) : (
             <>
               <div className="relative rounded-lg overflow-hidden bg-muted">
                 <img
                   src={imagePreview}
                   alt="Food preview"
                   className="w-full h-48 object-cover"
                 />
                 <Button
                   variant="secondary"
                   size="sm"
                   className="absolute top-2 right-2"
                   onClick={resetForm}
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
                 <div className="space-y-4">
                   <div className="bg-primary/10 rounded-lg p-4 space-y-3">
                     <div className="flex justify-between items-start">
                       <div>
                         <h3 className="font-semibold text-lg">{analysis.food_name}</h3>
                         <p className="text-sm text-muted-foreground">{analysis.portion_size}</p>
                       </div>
                       <span className={`text-xs px-2 py-1 rounded-full ${
                         analysis.confidence === 'high' ? 'bg-success/20 text-success' :
                         analysis.confidence === 'medium' ? 'bg-warning/20 text-warning' :
                         'bg-muted text-muted-foreground'
                       }`}>
                         {analysis.confidence} confidence
                       </span>
                     </div>
 
                     <div className="grid grid-cols-4 gap-2 text-center">
                       <div className="bg-background rounded-lg p-2">
                         <div className="text-xl font-bold text-primary">{analysis.calories}</div>
                         <div className="text-xs text-muted-foreground">kcal</div>
                       </div>
                       <div className="bg-background rounded-lg p-2">
                         <div className="text-lg font-semibold">{analysis.protein}g</div>
                         <div className="text-xs text-muted-foreground">Protein</div>
                       </div>
                       <div className="bg-background rounded-lg p-2">
                         <div className="text-lg font-semibold">{analysis.carbs}g</div>
                         <div className="text-xs text-muted-foreground">Carbs</div>
                       </div>
                       <div className="bg-background rounded-lg p-2">
                         <div className="text-lg font-semibold">{analysis.fats}g</div>
                         <div className="text-xs text-muted-foreground">Fats</div>
                       </div>
                     </div>
 
                     <p className="text-sm text-muted-foreground italic">
                       {analysis.description}
                     </p>
                   </div>
 
                   <div className="space-y-2">
                     <Label htmlFor="notes">Notes (optional)</Label>
                     <Textarea
                       id="notes"
                       value={notes}
                       onChange={(e) => setNotes(e.target.value)}
                       placeholder="Add any notes about this meal..."
                       rows={2}
                     />
                   </div>
 
                   <Button
                     onClick={saveFoodEntry}
                     disabled={isSaving}
                     className="w-full"
                   >
                     {isSaving ? (
                       <>
                         <Loader2 className="h-4 w-4 animate-spin mr-2" />
                         Saving...
                       </>
                     ) : (
                       'Save to Food Journal'
                     )}
                   </Button>
                 </div>
               )}
             </>
           )}
         </div>
       </DialogContent>
     </Dialog>
   );
 };