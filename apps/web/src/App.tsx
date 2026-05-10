import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import ContactsPage      from "./pages/ContactsPage";
import ContactDetailPage from "./pages/ContactDetailPage";
import ContactNewPage    from "./pages/ContactNewPage";
import ContactEditPage   from "./pages/ContactEditPage";
import ArchivedPage      from "./pages/ArchivedPage";
import BirthdaysPage     from "./pages/BirthdaysPage";
import CategoriesPage    from "./pages/CategoriesPage";

export default function App() {
  return (
    <BrowserRouter>
      <SignedIn>
        <Routes>
          <Route path="/"                  element={<ContactsPage />} />
          <Route path="/contacts/new"      element={<ContactNewPage />} />
          <Route path="/contacts/:id"      element={<ContactDetailPage />} />
          <Route path="/contacts/:id/edit" element={<ContactEditPage />} />
          <Route path="/archived"          element={<ArchivedPage />} />
          <Route path="/birthdays"         element={<BirthdaysPage />} />
          <Route path="/categories"        element={<CategoriesPage />} />
          <Route path="*"                  element={<Navigate to="/" replace />} />
        </Routes>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </BrowserRouter>
  );
}
