import { Link } from "react-router-dom";
import { Phone, Archive } from "lucide-react";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Contact } from "@/types";

interface Props {
  contact: Contact;
  onArchive?: (id: string) => void;
}

export default function ContactCard({ contact, onArchive }: Props) {
  return (
    <Card className="flex-row items-start justify-between gap-4 py-0 hover:shadow-sm transition-shadow">
      <Link to={`/contacts/${contact.id}`} className="flex-1 min-w-0 px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-foreground truncate">{contact.fullName}</p>
          {contact.categories?.map((cat) => (
            <CategoryBadge key={cat.id} color={cat.color} name={cat.name} />
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {contact.phone && (
            <span className="flex items-center gap-1">
              <Phone size={13} /> {contact.phone}
            </span>
          )}
          {contact.jobTitle && <span>{contact.jobTitle}</span>}
          {contact.hometown && <span>{contact.hometown}</span>}
        </div>
      </Link>
      {onArchive && (
        <CardContent className="py-3 px-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onArchive(contact.id)}
            title="Lưu trữ"
            className="text-muted-foreground"
          >
            <Archive size={16} />
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
