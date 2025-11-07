import { useState } from 'react';
import { AlertTriangle, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface ContentWarningProps {
  contentType: 'manga' | 'anime';
  rating: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const ContentWarning = ({ contentType, rating, onAccept, onDecline }: ContentWarningProps) => {
  const [understood, setUnderstood] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleAccept = () => {
    if (dontShowAgain) {
      localStorage.setItem('content_warning_accepted', 'true');
    }
    onAccept();
  };

  const isExplicit = rating.toLowerCase().includes('erotica') || 
                     rating.toLowerCase().includes('pornographic') ||
                     rating.toLowerCase().includes('hentai') ||
                     rating.toLowerCase().includes('suggestive');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-2xl w-full border-2 border-destructive/50 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <ShieldAlert className="h-16 w-16 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-destructive">
            Content Warning
          </CardTitle>
          <CardDescription className="text-lg">
            This {contentType} contains mature content
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Warning Details */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Content Rating: {rating}</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {isExplicit && (
                    <>
                      <li>This content contains explicit material</li>
                      <li>Intended for mature audiences only (18+)</li>
                      <li>May include sexual content, violence, or disturbing themes</li>
                    </>
                  )}
                  {!isExplicit && (
                    <>
                      <li>This content may contain suggestive themes</li>
                      <li>Viewer discretion is advised</li>
                      <li>May not be suitable for all audiences</li>
                    </>
                  )}
                  <li>By proceeding, you confirm you are of legal age in your jurisdiction</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Age Confirmation */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg">
              <Checkbox
                id="understood"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                className="mt-1"
              />
              <label
                htmlFor="understood"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I confirm that I am at least 18 years old and understand that this content may contain mature themes. I accept full responsibility for viewing this content.
              </label>
            </div>

            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
              <Checkbox
                id="dontShow"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              />
              <label
                htmlFor="dontShow"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Don't show this warning again for mature content
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1 gap-2"
            >
              <EyeOff className="h-4 w-4" />
              Go Back
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!understood}
              className="flex-1 gap-2 bg-primary hover:bg-primary/90"
            >
              <Eye className="h-4 w-4" />
              I Understand, Continue
            </Button>
          </div>

          {/* Legal Notice */}
          <p className="text-xs text-center text-muted-foreground pt-4 border-t">
            This warning is provided for your protection. By continuing, you acknowledge that you are legally permitted to view this content in your location.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
