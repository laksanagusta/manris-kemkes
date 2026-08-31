"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ActivityIcon,
  Alert02Icon,
  AlertCircleIcon,
  AlignLeftIcon,
  ArchiveIcon,
  ArrowDownIcon as ArrowDownDefinition,
  ArrowDownRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon as ArrowRightDefinition,
  ArrowUpDownIcon,
  ArrowUpIcon as ArrowUpDefinition,
  ArrowUpRightIcon,
  BarChartIcon,
  BookOpenIcon as BookOpenDefinition,
  BotOffIcon,
  BriefcaseIcon as BriefcaseDefinition,
  Building02Icon,
	CalendarClockIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CancelCircleIcon,
  CancelIcon,
  CheckIcon as CheckDefinition,
  CheckmarkCircle02Icon,
  CheckmarkCircleIcon,
  CheckmarkSquareIcon,
  ChevronDownIcon as ChevronDownDefinition,
  ChevronLeftIcon,
  ChevronRightIcon as ChevronRightDefinition,
  ChevronUpIcon as ChevronUpDefinition,
  CircleCheckIcon as CircleCheckDefinition,
  CircleDotIcon,
  CircleIcon,
  CircleMinusIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ClipboardPasteIcon,
  ClipboardPenLineIcon,
  Clock03Icon,
  ClockIcon,
  CloudUploadIcon,
  CopyIcon,
  CreditCardIcon as CreditCardDefinition,
  ChartDownIcon,
  ChartUpIcon,
  DashboardSquare01Icon,
  Delete02Icon,
  DollarSignIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  FileAddIcon,
  FileChartColumnIcon,
  FileDiffIcon,
  FileSearchIcon,
  FileSpreadsheetIcon,
  FileText as FileTextDefinition,
  FilterHorizontalIcon,
  FilterIcon as FilterDefinition,
  GaugeIcon,
  GitBranchIcon,
  GoalIcon,
  GripVerticalIcon,
  HelpCircleIcon as HelpCircleDefinition,
  HistoryIcon,
  InboxIcon,
  InformationCircleIcon,
  Key01Icon,
  LayersIcon,
  LayoutGridIcon as LayoutGridDefinition,
  Link02Icon,
  Loading03Icon,
  LockIcon,
  Logout01Icon,
  MagicWandIcon,
  MessageSquare as MessageSquareDefinition,
  MinusSignIcon,
  MonitorDotIcon,
  MoreHorizontalIcon as MoreHorizontalDefinition,
  OctagonXIcon as OctagonXDefinition,
  PanelLeftIcon as PanelLeftDefinition,
  PenIcon,
  PercentIcon,
  PencilEditIcon,
  PencilIcon,
  PlayCircleIcon,
  PlugIcon as PlugDefinition,
  PlusSignIcon,
  RefreshIcon,
  RocketIcon as RocketDefinition,
  RotateLeftIcon,
  SaveIcon,
  SearchIcon,
  Send as SendDefinition,
  ServerStackIcon,
  Settings02Icon,
  SettingsIcon as SettingsDefinition,
  ShieldAlert as ShieldAlertDefinition,
  ShieldCheck as ShieldCheckDefinition,
  ShieldIcon,
  ShieldX as ShieldXDefinition,
  SkipForward as SkipForwardDefinition,
  SlidersHorizontalIcon,
  SparklesIcon,
  SignatureIcon,
  TargetIcon,
  Type as TypeDefinition,
  UploadIcon,
  UserAdd01Icon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon as UserDefinition,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

type IconProps = Omit<
  React.ComponentPropsWithoutRef<typeof HugeiconsIcon>,
  "icon" | "strokeWidth"
> & {
  strokeWidth?: React.ComponentProps<"svg">["strokeWidth"];
};

function createIcon(icon: IconSvgElement, displayName: string) {
  const Component = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => {
    const { size = 24, strokeWidth, ...rest } = props;
    const normalizedStrokeWidth =
      typeof strokeWidth === "string"
        ? Number.parseFloat(strokeWidth) || undefined
        : strokeWidth;

    return (
      <HugeiconsIcon
        ref={ref}
        icon={icon}
        size={size}
        strokeWidth={normalizedStrokeWidth}
        {...rest}
      />
    );
  });

  Component.displayName = displayName;
  return Component;
}

export const Activity = createIcon(ActivityIcon, "Activity");
export const AlertCircle = createIcon(AlertCircleIcon, "AlertCircle");
export const AlertTriangle = createIcon(Alert02Icon, "AlertTriangle");
export const AlignLeft = createIcon(AlignLeftIcon, "AlignLeft");
export const Archive = createIcon(ArchiveIcon, "Archive");
export const ArrowDown = createIcon(ArrowDownDefinition, "ArrowDown");
export const ArrowDownIcon = createIcon(ArrowDownDefinition, "ArrowDownIcon");
export const ArrowDownRight = createIcon(ArrowDownRightIcon, "ArrowDownRight");
export const ArrowLeft = createIcon(ArrowLeftIcon, "ArrowLeft");
export const ArrowRight = createIcon(ArrowRightDefinition, "ArrowRight");
export const ArrowRightIcon = createIcon(ArrowRightDefinition, "ArrowRightIcon");
export const ArrowUp = createIcon(ArrowUpDefinition, "ArrowUp");
export const ArrowUpIcon = createIcon(ArrowUpDefinition, "ArrowUpIcon");
export const ArrowUpRight = createIcon(ArrowUpRightIcon, "ArrowUpRight");
export const BarChart3 = createIcon(BarChartIcon, "BarChart3");
export const BarChart3Icon = createIcon(BarChartIcon, "BarChart3Icon");
export const BookOpen = createIcon(BookOpenDefinition, "BookOpen");
export const BookOpenIcon = createIcon(BookOpenDefinition, "BookOpenIcon");
export const BotOff = createIcon(BotOffIcon, "BotOff");
export const BriefcaseIcon = createIcon(BriefcaseDefinition, "BriefcaseIcon");
export const Building2 = createIcon(Building02Icon, "Building2");
export const Calendar = createIcon(CalendarIcon, "Calendar");
export const CalendarClock = createIcon(CalendarClockIcon, "CalendarClock");
export const CalendarDays = createIcon(CalendarDaysIcon, "CalendarDays");
export const Check = createIcon(CheckDefinition, "Check");
export const CheckCircle = createIcon(CheckmarkCircleIcon, "CheckCircle");
export const CheckCircle2 = createIcon(CheckmarkCircle02Icon, "CheckCircle2");
export const CheckIcon = createIcon(CheckDefinition, "CheckIcon");
export const CheckSquare = createIcon(CheckmarkSquareIcon, "CheckSquare");
export const ChevronDown = createIcon(ChevronDownDefinition, "ChevronDown");
export const ChevronDownIcon = createIcon(ChevronDownDefinition, "ChevronDownIcon");
export const ChevronLeft = createIcon(ChevronLeftIcon, "ChevronLeft");
export const ChevronRight = createIcon(ChevronRightDefinition, "ChevronRight");
export const ChevronRightIcon = createIcon(ChevronRightDefinition, "ChevronRightIcon");
export const ChevronsUpDown = createIcon(ArrowUpDownIcon, "ChevronsUpDown");
export const ChevronUp = createIcon(ChevronUpDefinition, "ChevronUp");
export const ChevronUpIcon = createIcon(ChevronUpDefinition, "ChevronUpIcon");
export const Circle = createIcon(CircleIcon, "Circle");
export const CircleCheckIcon = createIcon(CircleCheckDefinition, "CircleCheckIcon");
export const CircleDot = createIcon(CircleDotIcon, "CircleDot");
export const ClipboardCheck = createIcon(ClipboardCheckIcon, "ClipboardCheck");
export const ClipboardList = createIcon(ClipboardListIcon, "ClipboardList");
export const ClipboardPaste = createIcon(ClipboardPasteIcon, "ClipboardPaste");
export const ClipboardPenLine = createIcon(ClipboardPenLineIcon, "ClipboardPenLine");
export const Clock = createIcon(ClockIcon, "Clock");
export const Clock3 = createIcon(Clock03Icon, "Clock3");
export const Copy = createIcon(CopyIcon, "Copy");
export const CreditCardIcon = createIcon(CreditCardDefinition, "CreditCardIcon");
export const DollarSign = createIcon(DollarSignIcon, "DollarSign");
export const Download = createIcon(DownloadIcon, "Download");
export const ExternalLink = createIcon(ExternalLinkIcon, "ExternalLink");
export const Eye = createIcon(EyeIcon, "Eye");
export const EyeOff = createIcon(EyeOffIcon, "EyeOff");
export const FileBarChart = createIcon(FileChartColumnIcon, "FileBarChart");
export const FileDiff = createIcon(FileDiffIcon, "FileDiff");
export const FilePlus2 = createIcon(FileAddIcon, "FilePlus2");
export const FileSearch = createIcon(FileSearchIcon, "FileSearch");
export const FileSignature = createIcon(SignatureIcon, "FileSignature");
export const FileSpreadsheet = createIcon(FileSpreadsheetIcon, "FileSpreadsheet");
export const FileText = createIcon(FileTextDefinition, "FileText");
export const FileTextIcon = createIcon(FileTextDefinition, "FileTextIcon");
export const Filter = createIcon(FilterDefinition, "Filter");
export const FilterIcon = createIcon(FilterDefinition, "FilterIcon");
export const Gauge = createIcon(GaugeIcon, "Gauge");
export const GitBranch = createIcon(GitBranchIcon, "GitBranch");
export const Goal = createIcon(GoalIcon, "Goal");
export const GripVertical = createIcon(GripVerticalIcon, "GripVertical");
export const HelpCircle = createIcon(HelpCircleDefinition, "HelpCircle");
export const HelpCircleIcon = createIcon(HelpCircleDefinition, "HelpCircleIcon");
export const History = createIcon(HistoryIcon, "History");
export const Inbox = createIcon(InboxIcon, "Inbox");
export const Info = createIcon(InformationCircleIcon, "Info");
export const InfoIcon = createIcon(InformationCircleIcon, "InfoIcon");
export const KeyRound = createIcon(Key01Icon, "KeyRound");
export const KeyRoundIcon = createIcon(Key01Icon, "KeyRoundIcon");
export const Layers3 = createIcon(LayersIcon, "Layers3");
export const LayoutDashboard = createIcon(DashboardSquare01Icon, "LayoutDashboard");
export const LayoutGridIcon = createIcon(LayoutGridDefinition, "LayoutGridIcon");
export const Link2 = createIcon(Link02Icon, "Link2");
export const ListFilter = createIcon(FilterHorizontalIcon, "ListFilter");
export const Loader2 = createIcon(Loading03Icon, "Loader2");
export const Loader2Icon = createIcon(Loading03Icon, "Loader2Icon");
export const Lock = createIcon(LockIcon, "Lock");
export const LogOut = createIcon(Logout01Icon, "LogOut");
export const LogOutIcon = createIcon(Logout01Icon, "LogOutIcon");
export const MessageSquare = createIcon(MessageSquareDefinition, "MessageSquare");
export const Minus = createIcon(MinusSignIcon, "Minus");
export const MinusCircle = createIcon(CircleMinusIcon, "MinusCircle");
export const MinusIcon = createIcon(MinusSignIcon, "MinusIcon");
export const MoreHorizontal = createIcon(MoreHorizontalDefinition, "MoreHorizontal");
export const MoreHorizontalIcon = createIcon(MoreHorizontalDefinition, "MoreHorizontalIcon");
export const MonitorDot = createIcon(MonitorDotIcon, "MonitorDot");
export const OctagonXIcon = createIcon(OctagonXDefinition, "OctagonXIcon");
export const PanelLeftIcon = createIcon(PanelLeftDefinition, "PanelLeftIcon");
export const Pen = createIcon(PenIcon, "Pen");
export const Pencil = createIcon(PencilIcon, "Pencil");
export const PencilLine = createIcon(PencilEditIcon, "PencilLine");
export const Percent = createIcon(PercentIcon, "Percent");
export const PlayCircle = createIcon(PlayCircleIcon, "PlayCircle");
export const PlugIcon = createIcon(PlugDefinition, "PlugIcon");
export const Plus = createIcon(PlusSignIcon, "Plus");
export const RefreshCcw = createIcon(RefreshIcon, "RefreshCcw");
export const RefreshCw = createIcon(RefreshIcon, "RefreshCw");
export const RocketIcon = createIcon(RocketDefinition, "RocketIcon");
export const RotateCcw = createIcon(RotateLeftIcon, "RotateCcw");
export const Save = createIcon(SaveIcon, "Save");
export const Search = createIcon(SearchIcon, "Search");
export const Send = createIcon(SendDefinition, "Send");
export const Server = createIcon(ServerStackIcon, "Server");
export const Settings2 = createIcon(Settings02Icon, "Settings2");
export const SettingsIcon = createIcon(SettingsDefinition, "SettingsIcon");
export const Shield = createIcon(ShieldIcon, "Shield");
export const ShieldAlert = createIcon(ShieldAlertDefinition, "ShieldAlert");
export const ShieldCheck = createIcon(ShieldCheckDefinition, "ShieldCheck");
export const ShieldX = createIcon(ShieldXDefinition, "ShieldX");
export const SkipForward = createIcon(SkipForwardDefinition, "SkipForward");
export const SlidersHorizontal = createIcon(SlidersHorizontalIcon, "SlidersHorizontal");
export const Sparkles = createIcon(SparklesIcon, "Sparkles");
export const Target = createIcon(TargetIcon, "Target");
export const Trash2 = createIcon(Delete02Icon, "Trash2");
export const TrendingDown = createIcon(ChartDownIcon, "TrendingDown");
export const TrendingDownIcon = createIcon(ChartDownIcon, "TrendingDownIcon");
export const TrendingUp = createIcon(ChartUpIcon, "TrendingUp");
export const TrendingUpIcon = createIcon(ChartUpIcon, "TrendingUpIcon");
export const TriangleAlertIcon = createIcon(Alert02Icon, "TriangleAlertIcon");
export const Type = createIcon(TypeDefinition, "Type");
export const Upload = createIcon(UploadIcon, "Upload");
export const UploadCloud = createIcon(CloudUploadIcon, "UploadCloud");
export const User = createIcon(UserDefinition, "User");
export const UserIcon = createIcon(UserDefinition, "UserIcon");
export const UserPlusIcon = createIcon(UserAdd01Icon, "UserPlusIcon");
export const UserRound = createIcon(UserCircleIcon, "UserRound");
export const Users = createIcon(UserGroupIcon, "Users");
export const UsersIcon = createIcon(UserGroupIcon, "UsersIcon");
export const WandSparkles = createIcon(MagicWandIcon, "WandSparkles");
export const X = createIcon(CancelIcon, "X");
export const XCircle = createIcon(CancelCircleIcon, "XCircle");
export const XIcon = createIcon(CancelIcon, "XIcon");
