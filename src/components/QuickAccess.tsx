import { Link } from 'react-router-dom';
import { Tv, BookOpen, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const QuickAccess = () => {
  const categories = [
    {
      title: 'Anime',
      icon: Tv,
      path: '/search?type=anime',
      gradient: 'from-primary/20 to-primary/5',
      iconColor: 'text-primary',
      description: 'Browse anime series',
    },
    {
      title: 'Manga',
      icon: BookOpen,
      path: '/search?type=manga',
      gradient: 'from-accent/20 to-accent/5',
      iconColor: 'text-accent',
      description: 'Read manga chapters',
    },
    {
      title: 'Characters',
      icon: Users,
      path: '/search?type=characters',
      gradient: 'from-secondary/20 to-secondary/5',
      iconColor: 'text-foreground',
      description: 'Discover characters',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <Link key={category.path} to={category.path}>
            <Card className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:scale-105 hover:-translate-y-1 border-border/50 hover:border-primary/50">
              <CardContent className={`p-8 bg-gradient-to-br ${category.gradient}`}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 rounded-2xl bg-card/50 backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <Icon className={`h-12 w-12 ${category.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-muted-foreground">{category.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};
