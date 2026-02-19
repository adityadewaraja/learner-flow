import { BookOpen, ArrowLeft, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
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
  { title: 'Manage Courses', url: '/admin/courses', icon: BookOpen },
];

export function AdminSidebar() {
  const { user, signOut } = useAuth();

  return (
    <Sidebar className="border-r border-border/40">
      <SidebarContent>
        <div className="px-4 py-5">
          <h1 className="text-lg font-bold tracking-tight text-foreground">Admin Panel</h1>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="hover:bg-accent/50" activeClassName="bg-accent text-accent-foreground font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" className="hover:bg-accent/50" activeClassName="">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    <span>Back to Learner View</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
