import type { Contact, Employee, ViewerContext } from "@shared/schema";

export function contactIsGM(contact: Contact): boolean {
  return contact.companies.some((cc) => cc.role === "GM");
}

export function resolveViewerFromContact(contact: Contact): ViewerContext {
  const isGM = contactIsGM(contact);
  const unrestricted = contact.isAdmin || isGM;
  return {
    actorId: contact.id,
    isAdmin: contact.isAdmin,
    isGM,
    managedModules: unrestricted
      ? null
      : (contact.managedModules?.length ? contact.managedModules : []),
  };
}

export function resolveViewerFromEmployee(
  employee: Employee,
  contactByEmail?: Contact,
): ViewerContext {
  if (contactByEmail) {
    return { ...resolveViewerFromContact(contactByEmail), actorId: employee.id };
  }
  return {
    actorId: employee.id,
    isAdmin: Boolean(employee.isAdmin),
    isGM: false,
    managedModules: null,
  };
}

export function isContactGMOfCompany(
  contacts: Contact[],
  adminId: string,
  companyId: string,
): boolean {
  const contact = contacts.find((c) => c.id === adminId);
  if (!contact) return false;
  return contact.companies.some(
    (cc) => cc.companyId === companyId && cc.role === "GM",
  );
}
