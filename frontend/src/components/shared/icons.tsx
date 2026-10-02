import { forwardRef, type ComponentProps } from "react";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  Activity01Icon as hugeIconData0,
  Alert02Icon as hugeIconData1,
  AlertCircleIcon as hugeIconData2,
  AlertTriangle as hugeIconData3,
  AlignLeftIcon as hugeIconData4,
  Archive01Icon as hugeIconData5,
  ArrowDownIcon as hugeIconData6,
  ArrowDownRightIcon as hugeIconData7,
  ArrowExpandIcon as hugeIconData8,
  ArrowLeftIcon as hugeIconData9,
  ArrowRightIcon as hugeIconData10,
  ArrowUpIcon as hugeIconData11,
  ArrowUpRightIcon as hugeIconData12,
  BarChartIcon as hugeIconData13,
  BookOpen01Icon as hugeIconData14,
  BookOpenIcon as hugeIconData15,
  BotOffIcon as hugeIconData16,
  BriefcaseIcon as hugeIconData17,
  Building02Icon as hugeIconData18,
  CalendarClockIcon as hugeIconData19,
  CalendarDaysIcon as hugeIconData20,
  CalendarIcon as hugeIconData21,
  Certificate01Icon as hugeIconData22,
  CheckIcon as hugeIconData23,
  CheckmarkCircle02Icon as hugeIconData24,
  CheckmarkCircleIcon as hugeIconData25,
  CircleCheckIcon as hugeIconData26,
  CircleDotIcon as hugeIconData27,
  CircleIcon as hugeIconData28,
  CircleMinusIcon as hugeIconData29,
  ClipboardCheckIcon as hugeIconData30,
  ClipboardListIcon as hugeIconData31,
  ClipboardPasteIcon as hugeIconData32,
  ClipboardPenLineIcon as hugeIconData33,
  Clock03Icon as hugeIconData34,
  ClockIcon as hugeIconData35,
  CloudUploadIcon as hugeIconData36,
  CopyIcon as hugeIconData37,
  CornerDownLeftIcon as hugeIconData38,
  CreditCardIcon as hugeIconData39,
  DollarSignIcon as hugeIconData40,
  DownloadIcon as hugeIconData41,
  ExternalLinkIcon as hugeIconData42,
  EyeIcon as hugeIconData43,
  EyeOffIcon as hugeIconData44,
  FileAddIcon as hugeIconData45,
  FileChartColumnIcon as hugeIconData46,
  FileDiffIcon as hugeIconData47,
  FileSearchIcon as hugeIconData48,
  FileSpreadsheetIcon as hugeIconData49,
  FileTextIcon as hugeIconData50,
  FilterIcon as hugeIconData51,
  Folder01Icon as hugeIconData52,
  GaugeIcon as hugeIconData53,
  GitBranchIcon as hugeIconData54,
  GoalIcon as hugeIconData55,
  GripVerticalIcon as hugeIconData56,
  HandshakeIcon as hugeIconData57,
  HelpCircleIcon as hugeIconData58,
  HistoryIcon as hugeIconData59,
  InboxIcon as hugeIconData60,
  InfoIcon as hugeIconData61,
  KeyRoundIcon as hugeIconData62,
  Layers01Icon as hugeIconData63,
  LayoutDashboardIcon as hugeIconData64,
  LayoutGridIcon as hugeIconData65,
  Link2 as hugeIconData66,
  ListFilterIcon as hugeIconData67,
  Loading03Icon as hugeIconData68,
  LockIcon as hugeIconData69,
  LogOutIcon as hugeIconData70,
  MessageSquareIcon as hugeIconData71,
  MinusIcon as hugeIconData72,
  MonitorDotIcon as hugeIconData73,
  MonitorIcon as hugeIconData74,
  MoonIcon as hugeIconData75,
  MoreHorizontalIcon as hugeIconData76,
  OctagonXIcon as hugeIconData77,
  PanelLeftIcon as hugeIconData78,
  PenIcon as hugeIconData79,
  PencilIcon as hugeIconData80,
  PencilLineIcon as hugeIconData81,
  PercentIcon as hugeIconData82,
  PlayCircleIcon as hugeIconData83,
  PlugIcon as hugeIconData84,
  PlusIcon as hugeIconData85,
  RefreshCcwIcon as hugeIconData86,
  RefreshCwIcon as hugeIconData87,
  RocketIcon as hugeIconData88,
  RotateCcwIcon as hugeIconData89,
  SaveIcon as hugeIconData90,
  SearchIcon as hugeIconData91,
  SendIcon as hugeIconData92,
  ServerIcon as hugeIconData93,
  Settings2 as hugeIconData94,
  SettingsIcon as hugeIconData95,
  ShieldAlertIcon as hugeIconData96,
  ShieldCheckIcon as hugeIconData97,
  ShieldIcon as hugeIconData98,
  ShieldXIcon as hugeIconData99,
  SignatureIcon as hugeIconData100,
  SkipForwardIcon as hugeIconData101,
  SlidersHorizontalIcon as hugeIconData102,
  SparklesIcon as hugeIconData103,
  SquareCheckIcon as hugeIconData104,
  SunIcon as hugeIconData105,
  TagIcon as hugeIconData106,
  TargetIcon as hugeIconData107,
  Trash2 as hugeIconData108,
  TrendingDownIcon as hugeIconData109,
  TrendingUpIcon as hugeIconData110,
  TriangleAlertIcon as hugeIconData111,
  TypeIcon as hugeIconData112,
  UploadIcon as hugeIconData113,
  UserIcon as hugeIconData114,
  UserPlusIcon as hugeIconData115,
  UserRoundIcon as hugeIconData116,
  UsersIcon as hugeIconData117,
  WandSparklesIcon as hugeIconData118,
  XCircle as hugeIconData119,
  XIcon as hugeIconData120,
} from "@hugeicons/core-free-icons";

/**
 * Keeps the existing shared icon component API while rendering Hugeicons assets.
 * Chevron icons intentionally remain Lucide to preserve the current UI controls.
 */
function createHugeIcon(icon: HugeiconsIconProps["icon"], displayName: string) {
  type SharedIconProps = Omit<HugeiconsIconProps, "icon" | "strokeWidth"> &
    Pick<ComponentProps<"svg">, "strokeWidth">;
  const Icon = forwardRef<SVGSVGElement, SharedIconProps>(
    function HugeiconCompat({ strokeWidth, ...props }, ref) {
      return (
        <HugeiconsIcon
          ref={ref}
          icon={icon}
          color="currentColor"
          strokeWidth={strokeWidth as number | undefined}
          {...props}
        />
      );
    },
  );
  Icon.displayName = displayName;
  return Icon;
}

const Activity = createHugeIcon(hugeIconData0, "Activity");
const Agreement03 = createHugeIcon(hugeIconData57, "Agreement03");
const Alert02 = createHugeIcon(hugeIconData1, "Alert02");
const AlertCircle = createHugeIcon(hugeIconData2, "AlertCircle");
const AlertTriangle = createHugeIcon(hugeIconData3, "AlertTriangle");
const AlignLeft = createHugeIcon(hugeIconData4, "AlignLeft");
const Archive = createHugeIcon(hugeIconData5, "Archive");
const ArrowDown = createHugeIcon(hugeIconData6, "ArrowDown");
const ArrowDownIcon = createHugeIcon(hugeIconData6, "ArrowDownIcon");
const ArrowDownRight = createHugeIcon(hugeIconData7, "ArrowDownRight");
const ArrowExpand = createHugeIcon(hugeIconData8, "ArrowExpand");
const ArrowLeft = createHugeIcon(hugeIconData9, "ArrowLeft");
const ArrowRight = createHugeIcon(hugeIconData10, "ArrowRight");
const ArrowRightIcon = createHugeIcon(hugeIconData10, "ArrowRightIcon");
const ArrowUp = createHugeIcon(hugeIconData11, "ArrowUp");
const ArrowUpIcon = createHugeIcon(hugeIconData11, "ArrowUpIcon");
const ArrowUpRight = createHugeIcon(hugeIconData12, "ArrowUpRight");
const BarChart3 = createHugeIcon(hugeIconData13, "BarChart3");
const BarChart3Icon = createHugeIcon(hugeIconData13, "BarChart3Icon");
const BookOpen = createHugeIcon(hugeIconData14, "BookOpen");
const BookOpenIcon = createHugeIcon(hugeIconData15, "BookOpenIcon");
const BotOff = createHugeIcon(hugeIconData16, "BotOff");
const BriefcaseIcon = createHugeIcon(hugeIconData17, "BriefcaseIcon");
const Building2 = createHugeIcon(hugeIconData18, "Building2");
const Calendar = createHugeIcon(hugeIconData21, "Calendar");
const CalendarClock = createHugeIcon(hugeIconData19, "CalendarClock");
const CalendarDays = createHugeIcon(hugeIconData20, "CalendarDays");
const Certificate01 = createHugeIcon(hugeIconData22, "Certificate01");
const Check = createHugeIcon(hugeIconData23, "Check");
const CheckCircle = createHugeIcon(hugeIconData25, "CheckCircle");
const CheckCircle2 = createHugeIcon(hugeIconData24, "CheckCircle2");
const CheckIcon = createHugeIcon(hugeIconData23, "CheckIcon");
const CheckSquare = createHugeIcon(hugeIconData104, "CheckSquare");
const Circle = createHugeIcon(hugeIconData28, "Circle");
const CircleCheckIcon = createHugeIcon(hugeIconData26, "CircleCheckIcon");
const CircleDot = createHugeIcon(hugeIconData27, "CircleDot");
const ClipboardCheck = createHugeIcon(hugeIconData30, "ClipboardCheck");
const ClipboardList = createHugeIcon(hugeIconData31, "ClipboardList");
const ClipboardPaste = createHugeIcon(hugeIconData32, "ClipboardPaste");
const ClipboardPenLine = createHugeIcon(hugeIconData33, "ClipboardPenLine");
const Clock = createHugeIcon(hugeIconData35, "Clock");
const Clock3 = createHugeIcon(hugeIconData34, "Clock3");
const Copy = createHugeIcon(hugeIconData37, "Copy");
const CornerDownLeft = createHugeIcon(hugeIconData38, "CornerDownLeft");
const CreditCardIcon = createHugeIcon(hugeIconData39, "CreditCardIcon");
const DollarSign = createHugeIcon(hugeIconData40, "DollarSign");
const Download = createHugeIcon(hugeIconData41, "Download");
const ExternalLink = createHugeIcon(hugeIconData42, "ExternalLink");
const Eye = createHugeIcon(hugeIconData43, "Eye");
const EyeOff = createHugeIcon(hugeIconData44, "EyeOff");
const FileBarChart = createHugeIcon(hugeIconData46, "FileBarChart");
const FileDiff = createHugeIcon(hugeIconData47, "FileDiff");
const FilePlus2 = createHugeIcon(hugeIconData45, "FilePlus2");
const FileSearch = createHugeIcon(hugeIconData48, "FileSearch");
const FileSignature = createHugeIcon(hugeIconData100, "FileSignature");
const FileSpreadsheet = createHugeIcon(hugeIconData49, "FileSpreadsheet");
const FileText = createHugeIcon(hugeIconData50, "FileText");
const FileTextIcon = createHugeIcon(hugeIconData50, "FileTextIcon");
const Filter = createHugeIcon(hugeIconData51, "Filter");
const FilterIcon = createHugeIcon(hugeIconData51, "FilterIcon");
const Folder01 = createHugeIcon(hugeIconData52, "Folder01");
const Gauge = createHugeIcon(hugeIconData53, "Gauge");
const GitBranch = createHugeIcon(hugeIconData54, "GitBranch");
const Goal = createHugeIcon(hugeIconData55, "Goal");
const GripVertical = createHugeIcon(hugeIconData56, "GripVertical");
const HelpCircle = createHugeIcon(hugeIconData58, "HelpCircle");
const HelpCircleIcon = createHugeIcon(hugeIconData58, "HelpCircleIcon");
const History = createHugeIcon(hugeIconData59, "History");
const Inbox = createHugeIcon(hugeIconData60, "Inbox");
const Info = createHugeIcon(hugeIconData61, "Info");
const InfoIcon = createHugeIcon(hugeIconData61, "InfoIcon");
const KeyRound = createHugeIcon(hugeIconData62, "KeyRound");
const KeyRoundIcon = createHugeIcon(hugeIconData62, "KeyRoundIcon");
const Layers3 = createHugeIcon(hugeIconData63, "Layers3");
const LayoutDashboard = createHugeIcon(hugeIconData64, "LayoutDashboard");
const LayoutGridIcon = createHugeIcon(hugeIconData65, "LayoutGridIcon");
const Link2 = createHugeIcon(hugeIconData66, "Link2");
const ListFilter = createHugeIcon(hugeIconData67, "ListFilter");
const Loader2 = createHugeIcon(hugeIconData68, "Loader2");
const Loader2Icon = createHugeIcon(hugeIconData68, "Loader2Icon");
const Lock = createHugeIcon(hugeIconData69, "Lock");
const LogOut = createHugeIcon(hugeIconData70, "LogOut");
const LogOutIcon = createHugeIcon(hugeIconData70, "LogOutIcon");
const MessageSquare = createHugeIcon(hugeIconData71, "MessageSquare");
const Minus = createHugeIcon(hugeIconData72, "Minus");
const MinusCircle = createHugeIcon(hugeIconData29, "MinusCircle");
const MinusIcon = createHugeIcon(hugeIconData72, "MinusIcon");
const Monitor = createHugeIcon(hugeIconData74, "Monitor");
const MonitorDot = createHugeIcon(hugeIconData73, "MonitorDot");
const Moon = createHugeIcon(hugeIconData75, "Moon");
const MoreHorizontal = createHugeIcon(hugeIconData76, "MoreHorizontal");
const MoreHorizontalIcon = createHugeIcon(hugeIconData76, "MoreHorizontalIcon");
const OctagonXIcon = createHugeIcon(hugeIconData77, "OctagonXIcon");
const PanelLeftIcon = createHugeIcon(hugeIconData78, "PanelLeftIcon");
const Pen = createHugeIcon(hugeIconData79, "Pen");
const Pencil = createHugeIcon(hugeIconData80, "Pencil");
const PencilLine = createHugeIcon(hugeIconData81, "PencilLine");
const Percent = createHugeIcon(hugeIconData82, "Percent");
const PlayCircle = createHugeIcon(hugeIconData83, "PlayCircle");
const PlugIcon = createHugeIcon(hugeIconData84, "PlugIcon");
const Plus = createHugeIcon(hugeIconData85, "Plus");
const RefreshCcw = createHugeIcon(hugeIconData86, "RefreshCcw");
const RefreshCw = createHugeIcon(hugeIconData87, "RefreshCw");
const RocketIcon = createHugeIcon(hugeIconData88, "RocketIcon");
const RotateCcw = createHugeIcon(hugeIconData89, "RotateCcw");
const Save = createHugeIcon(hugeIconData90, "Save");
const Search = createHugeIcon(hugeIconData91, "Search");
const SearchIcon = createHugeIcon(hugeIconData91, "SearchIcon");
const Send = createHugeIcon(hugeIconData92, "Send");
const Server = createHugeIcon(hugeIconData93, "Server");
const Settings2 = createHugeIcon(hugeIconData94, "Settings2");
const SettingsIcon = createHugeIcon(hugeIconData95, "SettingsIcon");
const Shield = createHugeIcon(hugeIconData98, "Shield");
const ShieldAlert = createHugeIcon(hugeIconData96, "ShieldAlert");
const ShieldCheck = createHugeIcon(hugeIconData97, "ShieldCheck");
const ShieldX = createHugeIcon(hugeIconData99, "ShieldX");
const SkipForward = createHugeIcon(hugeIconData101, "SkipForward");
const SlidersHorizontal = createHugeIcon(hugeIconData102, "SlidersHorizontal");
const Sparkles = createHugeIcon(hugeIconData103, "Sparkles");
const Sun = createHugeIcon(hugeIconData105, "Sun");
const Tag = createHugeIcon(hugeIconData106, "Tag");
const Target = createHugeIcon(hugeIconData107, "Target");
const Trash2 = createHugeIcon(hugeIconData108, "Trash2");
const TrendingDown = createHugeIcon(hugeIconData109, "TrendingDown");
const TrendingDownIcon = createHugeIcon(hugeIconData109, "TrendingDownIcon");
const TrendingUp = createHugeIcon(hugeIconData110, "TrendingUp");
const TrendingUpIcon = createHugeIcon(hugeIconData110, "TrendingUpIcon");
const TriangleAlertIcon = createHugeIcon(hugeIconData111, "TriangleAlertIcon");
const Type = createHugeIcon(hugeIconData112, "Type");
const Upload = createHugeIcon(hugeIconData113, "Upload");
const UploadCloud = createHugeIcon(hugeIconData36, "UploadCloud");
const User = createHugeIcon(hugeIconData114, "User");
const UserIcon = createHugeIcon(hugeIconData114, "UserIcon");
const UserPlusIcon = createHugeIcon(hugeIconData115, "UserPlusIcon");
const UserRound = createHugeIcon(hugeIconData116, "UserRound");
const Users = createHugeIcon(hugeIconData117, "Users");
const UsersIcon = createHugeIcon(hugeIconData117, "UsersIcon");
const WandSparkles = createHugeIcon(hugeIconData118, "WandSparkles");
const X = createHugeIcon(hugeIconData120, "X");
const XCircle = createHugeIcon(hugeIconData119, "XCircle");
const XIcon = createHugeIcon(hugeIconData120, "XIcon");

export { Activity, Agreement03, Alert02, AlertCircle, AlertTriangle, AlignLeft, Archive, ArrowDown, ArrowDownIcon, ArrowDownRight, ArrowExpand, ArrowLeft, ArrowRight, ArrowRightIcon, ArrowUp, ArrowUpIcon, ArrowUpRight, BarChart3, BarChart3Icon, BookOpen, BookOpenIcon, BotOff, BriefcaseIcon, Building2, Calendar, CalendarClock, CalendarDays, Certificate01, Check, CheckCircle, CheckCircle2, CheckIcon, CheckSquare, Circle, CircleCheckIcon, CircleDot, ClipboardCheck, ClipboardList, ClipboardPaste, ClipboardPenLine, Clock, Clock3, Copy, CornerDownLeft, CreditCardIcon, DollarSign, Download, ExternalLink, Eye, EyeOff, FileBarChart, FileDiff, FilePlus2, FileSearch, FileSignature, FileSpreadsheet, FileText, FileTextIcon, Filter, FilterIcon, Folder01, Gauge, GitBranch, Goal, GripVertical, HelpCircle, HelpCircleIcon, History, Inbox, Info, InfoIcon, KeyRound, KeyRoundIcon, Layers3, LayoutDashboard, LayoutGridIcon, Link2, ListFilter, Loader2, Loader2Icon, Lock, LogOut, LogOutIcon, MessageSquare, Minus, MinusCircle, MinusIcon, Monitor, MonitorDot, Moon, MoreHorizontal, MoreHorizontalIcon, OctagonXIcon, PanelLeftIcon, Pen, Pencil, PencilLine, Percent, PlayCircle, PlugIcon, Plus, RefreshCcw, RefreshCw, RocketIcon, RotateCcw, Save, Search, SearchIcon, Send, Server, Settings2, SettingsIcon, Shield, ShieldAlert, ShieldCheck, ShieldX, SkipForward, SlidersHorizontal, Sparkles, Sun, Tag, Target, Trash2, TrendingDown, TrendingDownIcon, TrendingUp, TrendingUpIcon, TriangleAlertIcon, Type, Upload, UploadCloud, User, UserIcon, UserPlusIcon, UserRound, Users, UsersIcon, WandSparkles, X, XCircle, XIcon };
export {
  ChevronDown,
  ChevronDownIcon,
  ChevronLeft,
  ChevronLeftIcon,
  ChevronRight,
  ChevronRightIcon,
  ChevronsUpDown,
  ChevronUp,
  ChevronUpIcon,
} from "lucide-react";
