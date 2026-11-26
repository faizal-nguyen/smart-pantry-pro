import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface ResumeAction { title: string; detail: string; path: string; cta: string }

/** Rank 1: one thing to resume, a cooking in progress before purchases to put away. */
export default function ResumeCard({ next }: { next: ResumeAction }) {
  return <Card className="kitchen-next"><CardContent>
    <div><h2>{next.title}</h2><p>{next.detail}</p></div>
    <Button className="min-h-11" asChild><Link to={next.path}>{next.cta}</Link></Button>
  </CardContent></Card>;
}
