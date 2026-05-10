import { Link } from "react-router-dom";
import { Phone, Archive } from "lucide-react";
import { CategoryBadge } from "@/components/CategoryBadge";
import type { Contact } from "@/types";

interface Props {
  contact: Contact;
  onArchive?: (id: string) => void;
}

export default function ContactCard({ contact, onArchive }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
      <Link to={`/contacts/${contact.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 truncate">{contact.fullName}</p>
          {contact.categories?.map((cat) => (
            <CategoryBadge key={cat.id} color={cat.color} name={cat.name} />
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
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
        <button
          onClick={() => onArchive(contact.id)}
          title="Lưu trữ"
          className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5"
        >
          <Archive size={16} />
        </button>
      )}
    </div>
  );
}
