import { 
  User, InsertUser, 
  Role, InsertRole, 
  Company, InsertCompany,
  AppData 
} from "@shared/schema";
import fs from "fs/promises";
import path from "path";

export interface IStorage {
  // Data Access
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  
  getRoles(): Promise<Role[]>;
  getCompanies(): Promise<Company[]>;
  
  // Full Data Access
  getAllData(): Promise<AppData>;
}

export class JsonStorage implements IStorage {
  private filePath: string;
  private data: AppData;
  private initialized: Promise<void>;

  constructor() {
    this.filePath = path.join(process.cwd(), "data.json");
    this.data = { users: [], roles: [], companies: [] };
    this.initialized = this.init();
  }

  private async init() {
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      this.data = JSON.parse(content);
    } catch (e) {
      // File doesn't exist or is invalid, seed with defaults
      await this.seed();
    }
  }

  private async save() {
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  private async seed() {
    this.data = {
      companies: [
        { id: 1, name: "Acme Corp" },
        { id: 2, name: "Globex Corporation" },
        { id: 3, name: "Soylent Corp" }
      ],
      roles: [
        { id: 1, name: "Administrator", privileges: ["view_all", "edit_all", "manage_users"] },
        { id: 2, name: "Manager", privileges: ["view_reports", "approve_requests"] },
        { id: 3, name: "Employee", privileges: ["view_own_data"] }
      ],
      users: [
        { id: 1, firstName: "Alice", lastName: "Admin", email: "alice@acme.com", roleId: 1, companyId: 1, isActive: true },
        { id: 2, firstName: "Bob", lastName: "Builder", email: "bob@acme.com", roleId: 2, companyId: 1, isActive: true },
        { id: 3, firstName: "Charlie", lastName: "Client", email: "charlie@globex.com", roleId: 3, companyId: 2, isActive: true },
        { id: 4, firstName: "David", lastName: "Developer", email: "david@soylent.com", roleId: 3, companyId: 3, isActive: false }
      ]
    };
    await this.save();
  }

  // --- Users ---

  async getUsers(): Promise<User[]> {
    await this.initialized;
    return this.data.users;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.initialized;
    const id = (this.data.users.length > 0 ? Math.max(...this.data.users.map(u => u.id)) : 0) + 1;
    const user: User = { ...insertUser, id, isActive: insertUser.isActive ?? true };
    this.data.users.push(user);
    await this.save();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    await this.initialized;
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error("User not found");
    
    const updatedUser = { ...this.data.users[index], ...updates };
    this.data.users[index] = updatedUser;
    await this.save();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    await this.initialized;
    this.data.users = this.data.users.filter(u => u.id !== id);
    await this.save();
  }

  // --- Roles & Companies (Read-only for MVP) ---

  async getRoles(): Promise<Role[]> {
    await this.initialized;
    return this.data.roles;
  }

  async getCompanies(): Promise<Company[]> {
    await this.initialized;
    return this.data.companies;
  }

  async getAllData(): Promise<AppData> {
    await this.initialized;
    return this.data;
  }
}

export const storage = new JsonStorage();
