import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Informasi akun Anda.</p>
      </div>
      <Card className="max-w-md border-border/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <CardTitle className="text-lg">{user?.email}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>User ID: {user?.id}</p>
          <p>Bergabung: {new Date(user?.created_at ?? '').toLocaleDateString('id-ID')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
