"use client";

import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileDown,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type StockCategory = {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  tags: string[];
};

export default function StockCategoriesPage() {
  const [data, setData] = useState<StockCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCategory, setSelectedCategory] =
    useState<StockCategory | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    isActive: true,
    tags: [],
  });
  const [updatedCategory, setUpdatedCategory] = useState({
    name: "",
    description: "",
    isActive: true,
    tags: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof StockCategory;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, [searchTerm, sortConfig]); //Corrected useEffect dependencies

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchTerm,
        sortBy: sortConfig ? `${sortConfig.key}:${sortConfig.direction}` : "",
      });
      const res = await fetch(
        `/api/stock-category?${queryParams}`
      );
      if (!res.ok) throw new Error("Failed to fetch stock categories");
      const newData = await res.json();
      setData(newData.data);
      setTotalItems(Number.parseInt(res.headers.get("X-Total-Count") || "0"));
    } catch (error) {
      toast.error("Failed to fetch stock categories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/stock-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });
      if (!res.ok) throw new Error("Failed to create stock category");
      setIsCreateModalOpen(false);
      setNewCategory({ name: "", description: "", isActive: true, tags: [] });
      toast.success("Stock category created successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to create stock category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/stock-category/${selectedCategory._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedCategory),
        }
      );
      if (!res.ok) throw new Error("Failed to update stock category");
      setIsUpdateModalOpen(false);
      toast.success("Stock category updated successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to update stock category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/stock-category/${selectedCategory._id}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Failed to delete stock category");
      setIsDeleteModalOpen(false);
      toast.success("Stock category deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete stock category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: keyof StockCategory) => {
    setSortConfig((prevConfig) => {
      if (prevConfig && prevConfig.key === key) {
        return {
          key,
          direction: prevConfig.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        "/api/stock-category/bulk-delete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedCategories }),
        }
      );
      if (!res.ok) throw new Error("Failed to delete selected categories");
      toast.success("Selected categories deleted successfully");
      setSelectedCategories([]);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete selected categories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["Name", "Description", "Created At", "Updated At", "Is Active", "Tags"],
      ...data.map((category) => [
        category.name,
        category.description,
        category.createdAt,
        category.updatedAt,
        category.isActive.toString(),
        category.tags.join(", "),
      ]),
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "stock_categories.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
      <Toaster />
      <div className="container mx-auto py-10">
        <h1 className="text-4xl font-bold mb-8">Stock Category Management</h1>
        <Card>
          <CardHeader>
            <CardTitle>Stock Categories</CardTitle>
            <CardDescription>
              Manage your stock categories here. You can add, edit, delete, and
              view details of each category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
            
                <div className="space-x-2">
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Category
                  </Button>
                
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                       
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("name")}
                      >
                        Name{" "}
                        {sortConfig?.key === "name" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("createdAt")}
                      >
                        Created At{" "}
                        {sortConfig?.key === "createdAt" &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                 
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((category) => (
                      <TableRow key={category._id}>
                        <TableCell>
                         
                        </TableCell>
                        <TableCell>{category.name}</TableCell>
                        <TableCell>{category.description}</TableCell>
                        <TableCell>
                          {new Date(category.createdAt).toLocaleString()}
                        </TableCell>
                  
                       
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setIsViewModalOpen(true);
                                }}
                              >
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setUpdatedCategory({
                                    name: category.name,
                                    description: category.description,
                                    isActive: category.isActive,
                                    tags: category.tags,
                                  });
                                  setIsUpdateModalOpen(true);
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="text-red-600"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label>Page Size:</Label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => setPageSize(Number(value))}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50].map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>
                    Page {currentPage} of {Math.ceil(totalItems / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, Math.ceil(totalItems / pageSize))
                      )
                    }
                    disabled={currentPage === Math.ceil(totalItems / pageSize)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          
        </Card>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Stock Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newCategory.name}
                    onChange={(e) =>
                      setNewCategory({ ...newCategory, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCategory.description}
                    onChange={(e) =>
                      setNewCategory({
                        ...newCategory,
                        description: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={newCategory.isActive}
                    onCheckedChange={(checked) =>
                      setNewCategory({ ...newCategory, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={newCategory.tags.join(", ")}
                    onChange={(e) =>
                      setNewCategory({
                        ...newCategory,
                        tags: e.target.value
                          .split(",")
                          .map((tag) => tag.trim()),
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="updateName">Name</Label>
                  <Input
                    id="updateName"
                    value={updatedCategory.name}
                    onChange={(e) =>
                      setUpdatedCategory({
                        ...updatedCategory,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="updateDescription">Description</Label>
                  <Textarea
                    id="updateDescription"
                    value={updatedCategory.description}
                    onChange={(e) =>
                      setUpdatedCategory({
                        ...updatedCategory,
                        description: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="updateIsActive"
                    checked={updatedCategory.isActive}
                    onCheckedChange={(checked) =>
                      setUpdatedCategory({
                        ...updatedCategory,
                        isActive: checked,
                      })
                    }
                  />
                  <Label htmlFor="updateIsActive">Active</Label>
                </div>
                <div>
                  <Label htmlFor="updateTags">Tags (comma-separated)</Label>
                  <Input
                    id="updateTags"
                    value={updatedCategory.tags?.join(", ") || ""}
                    onChange={(e) =>
                      setUpdatedCategory({
                        ...updatedCategory,
                        tags: e.target.value
                          .split(",")
                          .map((tag) => tag.trim()),
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Stock Category</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Are you sure you want to delete this stock category? This action
              cannot be undone.
            </DialogDescription>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Stock Category Details</DialogTitle>
            </DialogHeader>
            {selectedCategory && (
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <p className="mt-1">{selectedCategory.name}</p>
                </div>
                <div>
                  <Label>Description</Label>
                  <p className="mt-1">{selectedCategory.description}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge
                    variant={
                      selectedCategory.isActive ? "success" : "secondary"
                    }
                  >
                    {selectedCategory.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <Label>Tags</Label>
                  <div className="mt-1">
                    {selectedCategory &&
                      selectedCategory.tags &&
                      selectedCategory.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="mr-1">
                          {tag}
                        </Badge>
                      ))}
                  </div>
                </div>
                <div>
                  <Label>Created At</Label>
                  <p className="mt-1">
                    {new Date(selectedCategory.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Updated At</Label>
                  <p className="mt-1">
                    {new Date(selectedCategory.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
