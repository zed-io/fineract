# Angular Material to shadcn/ui Component Mapping

This document provides a detailed mapping between Angular Material components used in the web-app and their shadcn/ui equivalents for the Next.js application.

## Basic UI Components

| Angular Material | shadcn/ui | Notes |
|------------------|-----------|-------|
| `<mat-button>` | `<Button>` | Direct replacement with variants |
| `<mat-icon>` | `lucide-react` icons | Use Lucide icons library directly |
| `<mat-card>` | `<Card>` | Use with CardHeader, CardContent, CardFooter |
| `<mat-toolbar>` | `<header>` with Tailwind | Custom header component with Tailwind |
| `<mat-progress-bar>` | `<Progress>` | Direct replacement |
| `<mat-progress-spinner>` | Custom spinner | Use Tailwind or custom component |
| `<mat-divider>` | `<Separator>` | Direct replacement |
| `<mat-chip>` | `<Badge>` | Use with variants for different styles |
| `<mat-tooltip>` | `<Tooltip>` | Direct replacement |
| `<mat-badge>` | Custom Badge | Custom implementation or use with Badge variant |

## Form Components

| Angular Material | shadcn/ui | Notes |
|------------------|-----------|-------|
| `<mat-form-field>` | Form context | No direct equivalent, use Form components together |
| `<mat-label>` | `<Label>` | Use with form controls |
| `<mat-input>` | `<Input>` | Direct replacement |
| `<mat-select>` | `<Select>` | Use with SelectTrigger, SelectContent, SelectItem |
| `<mat-option>` | `<SelectItem>` | Use within Select components |
| `<mat-checkbox>` | `<Checkbox>` | Direct replacement |
| `<mat-radio-button>` | `<RadioGroup>` | Use with RadioGroupItem |
| `<mat-slide-toggle>` | `<Switch>` | Direct replacement |
| `<mat-datepicker>` | `<Calendar>` | Use with Popover for datepicker functionality |
| `<mat-autocomplete>` | `<Command>` | Use for autocomplete/combobox functionality |
| `<mat-textarea>` | `<Textarea>` | Direct replacement |

## Navigation Components

| Angular Material | shadcn/ui | Notes |
|------------------|-----------|-------|
| `<mat-sidenav>` | `<Sheet>` or custom sidebar | Create custom sidebar component |
| `<mat-sidenav-container>` | `<div>` layout with Tailwind | Use Tailwind grid or flex layouts |
| `<mat-tab>` | `<Tabs>` | Use with TabsList, TabsTrigger, TabsContent |
| `<mat-tab-group>` | `<Tabs>` | Parent component for tab structure |
| `<mat-menu>` | `<DropdownMenu>` | Use with DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem |
| `<mat-menu-item>` | `<DropdownMenuItem>` | Use within DropdownMenu |
| `<mat-stepper>` | Custom stepper component | Create custom component using shadcn/ui base |
| `<mat-paginator>` | DataTable pagination | Built into DataTable component |
| `<mat-breadcrumb>` | `<Breadcrumb>` | Use with BreadcrumbItem |

## Data Display Components

| Angular Material | shadcn/ui | Notes |
|------------------|-----------|-------|
| `<mat-table>` | `<DataTable>` | More powerful replacement using TanStack Table |
| `<mat-sort>` | `DataTable` sorting | Built into DataTable component |
| `<mat-paginator>` | `DataTable` pagination | Built into DataTable component |
| `<mat-expansion-panel>` | `<Accordion>` | Use with AccordionItem, AccordionTrigger, AccordionContent |
| `<mat-list>` | `<ul>` with Tailwind | Custom implementation with Tailwind |
| `<mat-list-item>` | `<li>` with Tailwind | Custom implementation with Tailwind |
| `<mat-tree>` | Custom tree component | No direct equivalent, create custom component |

## Dialog and Popup Components

| Angular Material | shadcn/ui | Notes |
|------------------|-----------|-------|
| `<mat-dialog>` | `<Dialog>` | Use with DialogTrigger, DialogContent, DialogHeader, DialogFooter |
| `<mat-dialog-content>` | `<DialogContent>` | Direct replacement |
| `<mat-snackbar>` | `<Toast>` | Use with useToast hook |
| `<mat-bottom-sheet>` | `<Sheet>` with side="bottom" | Configure Sheet to appear from bottom |

## Example Conversions

### 1. Basic Button

**Angular Material:**
```html
<button mat-raised-button color="primary">Submit</button>
```

**shadcn/ui:**
```tsx
<Button variant="default">Submit</Button>
```

### 2. Form Field

**Angular Material:**
```html
<mat-form-field>
  <mat-label>First Name</mat-label>
  <input matInput formControlName="firstName">
  <mat-error *ngIf="form.get('firstName').hasError('required')">
    First name is required
  </mat-error>
</mat-form-field>
```

**shadcn/ui:**
```tsx
<FormField
  control={form.control}
  name="firstName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>First Name</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 3. Select

**Angular Material:**
```html
<mat-form-field>
  <mat-label>Status</mat-label>
  <mat-select formControlName="status">
    <mat-option *ngFor="let status of statuses" [value]="status.value">
      {{status.label}}
    </mat-option>
  </mat-select>
</mat-form-field>
```

**shadcn/ui:**
```tsx
<FormField
  control={form.control}
  name="status"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Status</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {statuses.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 4. Data Table

**Angular Material:**
```html
<table mat-table [dataSource]="dataSource" matSort>
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
    <td mat-cell *matCellDef="let element">{{element.name}}</td>
  </ng-container>
  
  <ng-container matColumnDef="status">
    <th mat-header-cell *matHeaderCellDef>Status</th>
    <td mat-cell *matCellDef="let element">{{element.status}}</td>
  </ng-container>
  
  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
</table>

<mat-paginator [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>
```

**shadcn/ui:**
```tsx
// Define columns
const columns: ColumnDef<Client>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

// Use DataTable component
<DataTable
  columns={columns}
  data={clients}
  filters={[
    { label: "Name", value: "name" },
    { label: "Status", value: "status" },
  ]}
/>
```

### 5. Dialog

**Angular Material:**
```html
<button mat-button (click)="openDialog()">Open Dialog</button>

<!-- Dialog component -->
<h2 mat-dialog-title>Edit Client</h2>
<mat-dialog-content>
  <form [formGroup]="form">
    <!-- Form fields -->
  </form>
</mat-dialog-content>
<mat-dialog-actions>
  <button mat-button mat-dialog-close>Cancel</button>
  <button mat-raised-button color="primary" (click)="save()">Save</button>
</mat-dialog-actions>
```

**shadcn/ui:**
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open Dialog</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Edit Client</DialogTitle>
      <DialogDescription>
        Make changes to the client profile here.
      </DialogDescription>
    </DialogHeader>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Form fields */}
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

### 6. Tabs

**Angular Material:**
```html
<mat-tab-group>
  <mat-tab label="Details">
    <div class="tab-content">
      <!-- Details content -->
    </div>
  </mat-tab>
  <mat-tab label="Transactions">
    <div class="tab-content">
      <!-- Transactions content -->
    </div>
  </mat-tab>
</mat-tab-group>
```

**shadcn/ui:**
```tsx
<Tabs defaultValue="details" className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="transactions">Transactions</TabsTrigger>
  </TabsList>
  <TabsContent value="details">
    {/* Details content */}
  </TabsContent>
  <TabsContent value="transactions">
    {/* Transactions content */}
  </TabsContent>
</Tabs>
```

## Advanced Component Patterns

### Custom Data Visualization Components

For components like charts and graphs that don't have direct equivalents:

1. Use the `recharts` library that's already included in credit-cloud-admin
2. Create reusable chart components with shadcn/ui styling
3. Implement data transformation utilities to convert API data to chart format

### Custom Complex Forms

For complex multi-step forms:

1. Use the existing shadcn/ui Form components as building blocks
2. Create a custom stepper component using shadcn/ui styling
3. Use React Hook Form for form state management
4. Implement form validation with Zod schema validation

### Dashboard Cards and Metrics

For dashboard metrics and KPI cards:

1. Use shadcn/ui Card components as base
2. Create custom card variants for different metric types
3. Implement responsive layouts with Tailwind grid

## Implementation Strategy

1. Create a component library of shadcn/ui replacements for Angular Material
2. Implement page-by-page conversion, starting with core components
3. Test components for responsiveness and accessibility
4. Create documentation for component usage patterns