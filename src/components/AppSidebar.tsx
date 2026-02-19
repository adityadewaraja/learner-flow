import { BookOpen, CheckCircle, User, LogOut, Shield } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'My Learning', url: '/', icon: BookOpen },
  { title: 'Completed', url: '/completed', icon: CheckCircle },
  { title: 'Profile', url: '/profile', icon: User },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();

  return (
    <Sidebar className="border-r border-border/40">
      <SidebarContent>
        <div className="px-4 py-5">
          <h1 className="text-lg font-bold tracking-tight text-foreground">Corporate LMS</h1>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {user?.email}
          </p>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-accent/50"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {profile?.role === 'admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      className="hover:bg-accent/50"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
