import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function SectionCard({ title, icon, children }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }) {
    return (
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg flex items-center">
            <span className="mr-2">{icon}</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
  }