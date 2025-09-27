'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, UserCog, Loader2 } from 'lucide-react';

interface BootstrapAdminProps {
  onSuccess?: () => void;
}

export default function BootstrapAdmin({ onSuccess }: BootstrapAdminProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleBootstrap = async () => {
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/admin/bootstrap', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to bootstrap admin');
      }

      setMessage(data.message);
      // Refresh the page to re-check admin status
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-center">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You need an admin role to access the admin dashboard.
            </AlertDescription>
          </Alert>

          {process.env.NODE_ENV === 'development' && (
            <>
              <div className="text-sm text-gray-600 text-center">
                <strong>Development Mode:</strong> You can bootstrap admin
                access
              </div>

              <Button
                onClick={handleBootstrap}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up admin...
                  </>
                ) : (
                  <>
                    <UserCog className="mr-2 h-4 w-4" />
                    Bootstrap Admin Access
                  </>
                )}
              </Button>
            </>
          )}

          {message && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-gray-500 text-center">
            Contact your administrator to request admin access.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
