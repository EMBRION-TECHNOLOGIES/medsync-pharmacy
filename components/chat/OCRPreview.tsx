'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit3, Check, X, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';

interface OCRDrugData {
  id: string;
  drugName: string;
  strength: string;
  quantity: number;
  confidence: number; // 0-100
  isEdited: boolean;
}

interface OCRPreviewProps {
  imageUrl: string;
  onAccept: (drugs: OCRDrugData[]) => void;
  onReject: () => void;
  onEdit: (drugs: OCRDrugData[]) => void;
}

export function OCRPreview({ imageUrl, onAccept, onReject, onEdit }: OCRPreviewProps) {
  const [drugs, setDrugs] = useState<OCRDrugData[]>([
    {
      id: '1',
      drugName: 'Paracetamol',
      strength: '500mg',
      quantity: 2,
      confidence: 95,
      isEdited: false,
    },
    {
      id: '2',
      drugName: 'Amoxicillin',
      strength: '250mg',
      quantity: 1,
      confidence: 87,
      isEdited: false,
    },
  ]);


  const updateDrug = (id: string, field: keyof OCRDrugData, value: string | number) => {
    setDrugs(drugs.map(drug => 
      drug.id === id 
        ? { ...drug, [field]: value, isEdited: true }
        : drug
    ));
  };

  const removeDrug = (id: string) => {
    setDrugs(drugs.filter(drug => drug.id !== id));
  };

  const addDrug = () => {
    const newDrug: OCRDrugData = {
      id: Date.now().toString(),
      drugName: '',
      strength: '',
      quantity: 1,
      confidence: 0,
      isEdited: true,
    };
    setDrugs([...drugs, newDrug]);
  };

  const handleAccept = () => {
    if (drugs.length === 0) {
      toast.error('No drugs detected in the image');
      return;
    }
    onAccept(drugs);
  };

  const handleEdit = () => {
    onEdit(drugs);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-ms-green text-white';
    if (confidence >= 70) return 'bg-ms-yellow text-black';
    return 'bg-red-500 text-white';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 90) return 'High';
    if (confidence >= 70) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          OCR Drug Detection
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Review the detected medications. Backend will automatically create quote after approval.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Original Image */}
        <div className="space-y-2">
          <Label>Original Image</Label>
          <div className="border rounded-lg p-4 bg-muted/20">
            <img 
              src={imageUrl} 
              alt="Patient prescription" 
              className="max-w-full h-auto max-h-48 mx-auto rounded"
            />
          </div>
        </div>

        {/* Detected Drugs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Detected Medications</Label>
            <Button size="sm" variant="outline" onClick={addDrug}>
              <Package className="h-4 w-4 mr-2" />
              Add Drug
            </Button>
          </div>
          
          {drugs.length > 0 ? (
            <div className="space-y-3">
              {drugs.map((drug) => (
                <div key={drug.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getConfidenceColor(drug.confidence)}>
                        {getConfidenceText(drug.confidence)} ({drug.confidence}%)
                      </Badge>
                      {drug.isEdited && (
                        <Badge variant="outline" className="text-xs">
                          Edited
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDrug(drug.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`drug-${drug.id}`}>Drug Name</Label>
                      <Input
                        id={`drug-${drug.id}`}
                        value={drug.drugName}
                        onChange={(e) => updateDrug(drug.id, 'drugName', e.target.value)}
                        placeholder="Enter drug name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`strength-${drug.id}`}>Strength</Label>
                      <Input
                        id={`strength-${drug.id}`}
                        value={drug.strength}
                        onChange={(e) => updateDrug(drug.id, 'strength', e.target.value)}
                        placeholder="e.g., 500mg"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`quantity-${drug.id}`}>Quantity</Label>
                      <Input
                        id={`quantity-${drug.id}`}
                        type="number"
                        min="1"
                        value={drug.quantity}
                        onChange={(e) => updateDrug(drug.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No drugs detected in the image</p>
              <p className="text-sm">Try uploading a clearer image or add drugs manually</p>
            </div>
          )}
        </div>

        {/* Warnings */}
        {drugs.some(drug => drug.confidence < 70) && (
          <div className="bg-ms-yellow/10 border border-ms-yellow/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-ms-yellow">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Low Confidence Detection</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Some medications have low confidence scores. Please review and edit them carefully.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onReject}>
            <X className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button variant="outline" onClick={handleEdit}>
            <Edit3 className="h-4 w-4 mr-2" />
            Edit & Continue
          </Button>
          <Button onClick={handleAccept} className="bg-ms-green hover:bg-ms-green/90">
            <Check className="h-4 w-4 mr-2" />
            Accept & Process
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
