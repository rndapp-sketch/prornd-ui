// import * as React from "react"
// import {
//   flexRender,
//   getCoreRowModel,
//   getFilteredRowModel,
//   getPaginationRowModel,
//   getSortedRowModel,
//   useReactTable,
// } from "@tanstack/react-table"
// import type {
//   ColumnDef,
//   ColumnFiltersState,
//   SortingState,
//   VisibilityState,
// } from "@tanstack/react-table"
// import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"

// import { Button } from "@/components/ui/button"
// import { Checkbox } from "@/components/ui/checkbox"
// import {
//   DropdownMenu,
//   DropdownMenuCheckboxItem,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// import { Input } from "@/components/ui/input"
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"
// import { useFrappeGetDocList, useFrappeAuth } from "frappe-react-sdk"
// import { AppSidebar } from "@/components/RndSidebar"
// import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
// import { MenuIcon } from "lucide-react"
// import  {ProjectRegistration } from "./ProjectRegistration"
// import ProjectDetails from "./ProjectDetails"
// import { UserCreation } from "./UserCreation"
// import UserList from "./UserList"
// import Home from "./Home"
// import Endorsement from "./Endorsement"
// import AddFundSanction from "./AddFundSanction"
// import AddReceivedFunds from "./AddReceivedFunds"

// type Project = {
//   name: string;
//   project_name: string;
//   status: string;
//   project_type: string;
//   name_of_the_principal_investigator: string;
// };

// export const columns: ColumnDef<Project>[] = [
//   {
//     id: "select",
//     header: ({ table }) => (
//       <Checkbox
//         checked={
//           table.getIsAllPageRowsSelected() ||
//           (table.getIsSomePageRowsSelected() && "indeterminate")
//         }
//         onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
//         aria-label="Select all"
//       />
//     ),
//     cell: ({ row }) => (
//       <Checkbox
//         checked={row.getIsSelected()}
//         onCheckedChange={(value) => row.toggleSelected(!!value)}
//         aria-label="Select row"
//       />
//     ),
//     enableSorting: false,
//     enableHiding: false,
//   },
//   {
//     accessorKey: "name",
//     header: ({ column }) => {
//       return (
//         <Button
//           variant="ghost"
//           onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
//         >
//           ID
//           <ArrowUpDown className="ml-2 h-4 w-4" />
//         </Button>
//       )
//     },
//     cell: ({ row }) => <div className="lowercase">{row.getValue("name")}</div>,
//   },
//   {
//     accessorKey: "project_name",
//     header: "Project Name",
//     cell: ({ row }) => (
//       <div className="capitalize">{row.getValue("project_name")}</div>
//     ),
//   },
//   {
//     accessorKey: "status",
//     header: "Status",
//     cell: ({ row }) => (
//       <div className="capitalize">{row.getValue("status")}</div>
//     ),
//     enableHiding: false,
//   },
//   {
//     accessorKey: "project_type",
//     header: "Project Type",
//     cell: ({ row }) => (
//       <div className="capitalize">{row.getValue("project_type")}</div>
//     ),
//   },
//   {
//     accessorKey: "principal_investigator_name",
//     header: "Principal Investigator",
//     cell: ({ row }) => (
//       <div className="capitalize">{row.getValue("principal_investigator_name")}</div>
//     ),
//   },
//   {
//     id: "actions",
//     enableHiding: false,
//     cell: ({ row, table }) => {
//       const project = row.original
//       const { setActiveView, setSelectedProject } = table.options.meta as any
//       return (
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="ghost" className="h-8 w-8 p-0">
//               <span className="sr-only">Open menu</span>
//               <MoreHorizontal className="h-4 w-4" />
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="end">
//             <DropdownMenuLabel>Actions</DropdownMenuLabel>
//             <DropdownMenuItem
//               onClick={() => navigator.clipboard.writeText(project.name)}
//             >
//               Copy project ID
//             </DropdownMenuItem>
//             <DropdownMenuSeparator />
//             <DropdownMenuItem onClick={() => {
//               setActiveView("project-details")
//               setSelectedProject(project.name)
//             }}>
//               View project
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>
//       )
//     },
//   },
// ]

// export default function Dashboard() {
//   const [sorting, setSorting] = React.useState<SortingState>([])
//   const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
//     []
//   )
//   const [columnVisibility, setColumnVisibility] =
//     React.useState<VisibilityState>({})
//   const [rowSelection, setRowSelection] = React.useState({})
//   const [activeView, setActiveView] = React.useState("home")
//   const [selectedProject, setSelectedProject] = React.useState<string | null>(null)

//   const { currentUser } = useFrappeAuth();

//   const { data: projects, error } = useFrappeGetDocList("Project Registration", {
//     fields: ["name", "status", "project_type", "name_of_the_principal_investigator"],
//     limit: 100,
//   });

//   const table = useReactTable({
//     data: projects || [],
//     columns,
//     onSortingChange: setSorting,
//     onColumnFiltersChange: setColumnFilters,
//     getCoreRowModel: getCoreRowModel(),
//     getPaginationRowModel: getPaginationRowModel(),
//     getSortedRowModel: getSortedRowModel(),
//     getFilteredRowModel: getFilteredRowModel(),
//     onColumnVisibilityChange: setColumnVisibility,
//     onRowSelectionChange: setRowSelection,
//     state: {
//       sorting,
//       columnFilters,
//       columnVisibility,
//       rowSelection,
//     },
//     meta: {
//       setActiveView,
//       setSelectedProject,
//     }
//   })

//   return (
//     <SidebarProvider className="flex h-screen bg-gray-50">
//       <AppSidebar setActiveView={setActiveView} />
//       <SidebarInset>
//           <header className="flex items-center justify-between gap-4 p-4 border-b bg-white">
//               <div className="flex items-center gap-4">
//                   <SidebarTrigger>
//                   <MenuIcon className="size-6" />
//                   </SidebarTrigger>
//                   <h1 className="text-2xl font-bold">
//                     {activeView === "projects" && "Projects"}
//                     {activeView === "project-registration" && "Project Registration"}
//                     {activeView === "project-details" && "Project Details"}
//                     {activeView === "user-creation" && "User Creation"}
//                     {activeView === "home" && "Home"}
//                     {activeView === "user-list" && "User List"}
//                     {activeView === "endorsement" && "Endorsement"}
//                     {activeView === "add-fund-sanction" && "Add Fund Sanction"}
//                     {activeView === "add-received-funds" && "Add Received Funds"}
//                   </h1>
//               </div>
//               {currentUser && (
//               <div className="flex items-center gap-2">
//                   <span>Welcome, {currentUser}</span>
//               </div>
//               )}
//           </header>
//           <main className="flex-1 overflow-y-auto p-4">
//               {activeView === "projects" && (
//               <div className="w-full">
//                   <div className="flex items-center py-4">
//                       <Input
//                       placeholder="Filter by project name..."
//                       value={(table.getColumn("project_name")?.getFilterValue() as string) ?? ""}
//                       onChange={(event) =>
//                           table.getColumn("project_name")?.setFilterValue(event.target.value)
//                       }
//                       className="flex-1"
//                       />
//                       <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                           <Button variant="outline" className="ml-auto flex-shrink-0">
//                           Columns <ChevronDown className="ml-2 h-4 w-4" />
//                           </Button>
//                       </DropdownMenuTrigger>
//                       <DropdownMenuContent align="end">
//                           {table
//                           .getAllColumns()
//                           .filter((column) => column.getCanHide())
//                           .map((column) => {
//                               return (
//                               <DropdownMenuCheckboxItem
//                                   key={column.id}
//                                   className="capitalize"
//                                   checked={column.getIsVisible()}
//                                   onCheckedChange={(value) =>
//                                   column.toggleVisibility(!!value)
//                                   }
//                               >
//                                   {column.id}
//                               </DropdownMenuCheckboxItem>
//                               )
//                           })}
//                       </DropdownMenuContent>
//                       </DropdownMenu>
//                   </div>
//                   <div className="rounded-md border">
//                       <Table>
//                       <TableHeader>
//                           {table.getHeaderGroups().map((headerGroup) => (
//                           <TableRow key={headerGroup.id}>
//                               {headerGroup.headers.map((header) => {
//                               return (
//                                   <TableHead key={header.id}>
//                                   {header.isPlaceholder
//                                       ? null
//                                       : flexRender(
//                                           header.column.columnDef.header,
//                                           header.getContext()
//                                       )}
//                                   </TableHead>
//                               )
//                               })}
//                           </TableRow>
//                           ))}
//                       </TableHeader>
//                       <TableBody>
//                           {table.getRowModel().rows?.length ? (
//                           table.getRowModel().rows.map((row) => (
//                               <TableRow
//                               key={row.id}
//                               data-state={row.getIsSelected() && "selected"}
//                               >
//                               {row.getVisibleCells().map((cell) => (
//                                   <TableCell key={cell.id}>
//                                   {flexRender(
//                                       cell.column.columnDef.cell,
//                                       cell.getContext()
//                                   )}
//                                   </TableCell>
//                               ))}
//                               </TableRow>
//                           ))
//                           ) : (
//                           <TableRow>
//                               <TableCell
//                               colSpan={columns.length}
//                               className="h-24 text-center"
//                               >
//                               No results.
//                               </TableCell>
//                           </TableRow>
//                           )}
//                       </TableBody>
//                       </Table>
//                   </div>
//                   <div className="flex items-center justify-end space-x-2 py-4">
//                       <div className="flex-1 text-sm text-muted-foreground">
//                       {table.getFilteredSelectedRowModel().rows.length} of{" "}
//                       {table.getFilteredRowModel().rows.length} row(s) selected.
//                       </div>
//                       <div className="space-x-2">
//                       <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => table.previousPage()}
//                           disabled={!table.getCanPreviousPage()}
//                       >
//                           Previous
//                       </Button>
//                       <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => table.nextPage()}
//                           disabled={!table.getCanNextPage()}
//                       >
//                           Next
//                       </Button>
//                       </div>
//                   </div>
//               </div>
//               )}
//               {activeView === "project-registration" && <ProjectRegistration />}
//               {activeView === "project-details" && selectedProject && <ProjectDetails projectName={selectedProject} />}
//               {activeView === "user-creation" && <UserCreation />}
//               {activeView === "user-list" && <UserList />}
//               {activeView === "home" && <Home setActiveView={setActiveView} setSelectedProject={setSelectedProject} />}
//               {activeView === "endorsement" && <Endorsement />}
//               {activeView === "add-fund-sanction" && <AddFundSanction />}
//               {activeView === "add-received-funds" && <AddReceivedFunds />}
//           </main>
//       </SidebarInset>
//     </SidebarProvider>
//   )
// }





// ====================


import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFrappeGetDocList, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk"
import { AppSidebar } from "@/components/RndSidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { MenuIcon, UserIcon } from "lucide-react" // Added UserIcon import
import ProjectRegistration from "./ProjectRegistration"
import ProjectDetails from "./ProjectDetails" // This should be ProjectDetailsView
import { UserCreation } from "./UserCreation"
import UserList from "./UserList"
import Home from "./Home"
import Endorsement from "./Endorsement"
import AddFundSanction from "./AddFundSanction"
import AddReceivedFunds from "./AddReceivedFunds"

type Project = {
  name: string;
  project_name: string;
  status: string;
  project_type: string;
  name_of_the_principal_investigator: string;
};

export const columns: ColumnDef<Project>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="lowercase">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "project_name",
    header: "Project Name",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("project_name")}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("status")}</div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "project_type",
    header: "Project Type",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("project_type")}</div>
    ),
  },
  {
    accessorKey: "principal_investigator_name",
    header: "Principal Investigator",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("principal_investigator_name")}</div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row, table }) => {
      const project = row.original
      const { setActiveView, setSelectedProject } = table.options.meta as any
      return (
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
              onClick={() => navigator.clipboard.writeText(project.name)}
            >
              Copy project ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              setActiveView("project-details")
              setSelectedProject(project.name)
            }}>
              View project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function Dashboard() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [activeView, setActiveView] = React.useState("home")
  const [selectedProject, setSelectedProject] = React.useState<string | null>(null)

  const { currentUser } = useFrappeAuth();
  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["user_image"],
    enabled: !!currentUser, // Only fetch if currentUser is available
  });

  const { data: projects, error } = useFrappeGetDocList("Project Registration", {
    fields: ["name", "status", "project_type", "name_of_the_principal_investigator", "project_name"],
    limit: 100,
  });

  const table = useReactTable({
    data: projects || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    meta: {
      setActiveView,
      setSelectedProject,
    }
  })

  // ✨ Function now handles returning to the home view
  const handleGoHome = () => {
    setActiveView("home");
    setSelectedProject(null);
  };

  return (
    <SidebarProvider className="flex h-screen bg-gray-50">
      <AppSidebar setActiveView={setActiveView} />
      <SidebarInset>
          <header className="flex items-center justify-between gap-4 p-4 border-b bg-white">
              <div className="flex items-center gap-4">
                  <SidebarTrigger>
                  <MenuIcon className="size-6" />
                  </SidebarTrigger>
                  <h1 className="text-2xl font-bold">
                    {activeView === "projects" && "Projects"}
                    {activeView === "project-registration" && "Project Registration"}
                    {activeView === "project-details" && "Project Details"}
                    {activeView === "user-creation" && "User Creation"}
                    {activeView === "home" && "Home"}
                    {activeView === "user-list" && "User List"}
                    {activeView === "endorsement" && "Endorsement"}
                    {activeView === "add-fund-sanction" && "Add Fund Sanction"}
                    {activeView === "add-received-funds" && "Add Received Funds"}
                  </h1>
              </div>
              {currentUser && (
              <div className="flex items-center gap-2">
                  {isUserLoading ? (
                      <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                  ) : (
                      <img
                          src={userData?.user_image || 'https://placehold.co/32x32/E0E7FF/4F46E5?text=NA'}
                          alt="User Profile"
                          className="h-8 w-8 rounded-full object-cover border border-gray-200"
                          onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = 'https://placehold.co/32x32/E0E7FF/4F46E5?text=NA';
                          }}
                      />
                  )}
                  <span>Welcome, {currentUser}</span>
              </div>
              )}
          </header>
          <main className="flex-1 overflow-y-auto p-4">
              {activeView === "projects" && (
              <div className="w-full">
                  <div className="flex items-center py-4">
                      <Input
                      placeholder="Filter by project name..."
                      value={(table.getColumn("project_name")?.getFilterValue() as string) ?? ""}
                      onChange={(event) =>
                          table.getColumn("project_name")?.setFilterValue(event.target.value)
                      }
                      className="flex-1"
                      />
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="ml-auto flex-shrink-0">
                          Columns <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          {table
                          .getAllColumns()
                          .filter((column) => column.getCanHide())
                          .map((column) => {
                              return (
                              <DropdownMenuCheckboxItem
                                  key={column.id}
                                  className="capitalize"
                                  checked={column.getIsVisible()}
                                  onCheckedChange={(value) =>
                                  column.toggleVisibility(!!value)
                                  }
                              >
                                  {column.id}
                              </DropdownMenuCheckboxItem>
                              )
                          })}
                      </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                  <div className="rounded-md border">
                      <Table>
                      <TableHeader>
                          {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map((header) => {
                              return (
                                  <TableHead key={header.id}>
                                  {header.isPlaceholder
                                      ? null
                                      : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext()
                                      )}
                                  </TableHead>
                              )
                              })}
                          </TableRow>
                          ))}
                      </TableHeader>
                      <TableBody>
                          {table.getRowModel().rows?.length ? (
                          table.getRowModel().rows.map((row) => (
                              <TableRow
                              key={row.id}
                              data-state={row.getIsSelected() && "selected"}
                              >
                              {row.getVisibleCells().map((cell) => (
                                  <TableCell key={cell.id}>
                                  {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                  )}
                                  </TableCell>
                              ))}
                              </TableRow>
                          ))
                          ) : (
                          <TableRow>
                              <TableCell
                              colSpan={columns.length}
                              className="h-24 text-center"
                              >
                              No results.
                              </TableCell>
                          </TableRow>
                          )}
                      </TableBody>
                      </Table>
                  </div>
                  <div className="flex items-center justify-end space-x-2 py-4">
                      <div className="flex-1 text-sm text-muted-foreground">
                      {table.getFilteredSelectedRowModel().rows.length} of{" "}
                      {table.getFilteredRowModel().rows.length} row(s) selected.
                      </div>
                      <div className="space-x-2">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                      >
                          Previous
                      </Button>
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                      >
                          Next
                      </Button>
                      </div>
                  </div>
              </div>
              )}
              {activeView === "project-registration" && <ProjectRegistration />}
              {activeView === "project-details" && selectedProject && <ProjectDetails projectName={selectedProject} onBack={handleGoHome} />}
              {activeView === "user-creation" && <UserCreation />}
              {activeView === "user-list" && <UserList />}
              {activeView === "home" && <Home setActiveView={setActiveView} setSelectedProject={setSelectedProject} />}
              {activeView === "endorsement" && <Endorsement />}
              {activeView === "add-fund-sanction" && <AddFundSanction />}
              {activeView === "add-received-funds" && <AddReceivedFunds />}
          </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
