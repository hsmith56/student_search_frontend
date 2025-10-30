"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  GraduationCap,
  MapPin,
  Heart,
  MessageSquare,
  AlertCircle,
  Video,
  Home,
} from "lucide-react";

interface StudentData {
  first_name: string;
  app_id: number;
  pax_id: number;
  country: string;
  gpa: string;
  english_score: string;
  applying_to_grade: number;
  usahsid: string;
  program_type: string;
  adjusted_age: number;
  selected_interests: string[];
  urban_request: string;
  placement_status: string;
  gender_desc: string;
  id: number;
  current_grade: number;
  status: string;
  states: string[];
  early_placement: boolean;
  single_placement: boolean;
  double_placement: boolean;
  free_text_interests: string[];
  family_description: string;
  favorite_subjects: string;
  photo_comments: string;
  religion: string;
  allergy_comments: string;
  dietary_restrictions: string;
  religious_frequency: number;
  intro_message: string;
  message_to_host_family: string;
  message_from_natural_family: string;
  media_link: string;
  health_comments: string[];
  live_with_pets: boolean;
  local_coordinator: string;
}

const API_URL = "/api";

const getStatusRingColor = (status: string) => {
  if (!status) return "border-slate-300";

  const statusLower = status.toLowerCase();
  if (statusLower.includes("pending")) return "border-yellow-200 bg-yellow-50";
  if (statusLower.includes("placed"))
    return "border-green-500 rounded-md bg-green-100";
  if (statusLower === "allocated") return "border-blue-500 bg-blue-100";
  if (statusLower === "unassigned") return "border-slate-500 bg-slate-300 ";

  return "border-slate-300";
};

export default function StudentProfilePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams?.get("id") ?? undefined;

  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!studentId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!studentId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(`${API_URL}/students/full/${studentId}`, {
      method: "GET",
      headers: { accept: "application/json" },
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (mounted) setStudent(data);
      })
      .catch((err) => {
        console.error("Error fetching student data:", err);
        if (mounted) setError(String(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [studentId]);

  if (!studentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Missing Student ID
            </CardTitle>
            <CardDescription>
              Please provide a student ID in the URL.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Student Not Found
            </CardTitle>
            <CardDescription>
              {error
                ? `Unable to load student data: ${error}`
                : `Unable to load student data for ID: ${studentId}`}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    // <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
    <div className="min-h-screen bg-gray-200">
      <div className="container mx-auto px-4 py-8 max-w-90%">
        {/* Header Section */}
        <div className="mb-2">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
                  {student.first_name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Student ID: {student.usahsid}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2 mt-1">
            <Badge
              variant="outline"
              className={`text-xs ${getStatusRingColor(
                student.placement_status
              )}`}
            >
              {student.placement_status}
            </Badge>
            {student.early_placement && (
              <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">
                Early Placement
              </Badge>
            )}
            {student.media_link && (
              <Badge
                variant="outline"
                className="text-xs border-slate-300 bg-white"
              >
                <a
                  href={student.media_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline text-xs flex items-center gap-2"
                >
                  <Video className="w-4 h-4 text-pink-600" />
                  View Media
                </a>
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Basic Information */}
          <Card className="shadow-sm border border-slate-300">
            <CardHeader className="border-l-4 border-blue-500 pl-4 bg-gradient-to-r from-blue-50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600 mt-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              <div className="py-1">
                <InfoRow label="Application ID" value={student.app_id} />
              </div>
              <div className="py-1">
                <InfoRow label="PAX ID" value={student.pax_id} />
              </div>
              <div className="py-1">
                <InfoRow label="Gender" value={student.gender_desc} />
              </div>
              <div className="py-1">
                <InfoRow label="Age" value={student.adjusted_age} />
              </div>
              <div className="py-1">
                <InfoRow label="Country" value={student.country} />
              </div>
            </CardContent>
          </Card>

          {/* Academic Profile */}
          <Card className="shadow-sm border border-slate-300">
            <CardHeader className="border-l-4 border-green-500 pl-4 bg-gradient-to-r from-green-50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-green-600 mt-2" />
                Academic Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              <div className="py-1">
                <InfoRow label="GPA" value={student.gpa} />
              </div>
              <div className="py-1">
                <InfoRow label="English Score" value={student.english_score} />
              </div>
              <div className="py-1">
                <InfoRow label="Current Grade" value={student.current_grade} />
              </div>
              <div className="py-1">
                <InfoRow
                  label="Applying to Grade"
                  value={student.applying_to_grade}
                />
              </div>
              {student.favorite_subjects && (
                <div className="py-1">
                  <InfoRow
                    label="Favorite Subjects"
                    value={student.favorite_subjects}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Placement Details */}
          <Card className="shadow-sm border border-slate-300">
            <CardHeader className="border-l-4 border-purple-500 pl-4 bg-gradient-to-r from-purple-50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600 mt-2" />
                Placement Details
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              <div className="py-1">
                <InfoRow label="Program Type" value={student.program_type} />
              </div>
              <div className="py-1">
                <InfoRow label="Urban Request" value={student.urban_request} />
              </div>
              <div className="py-1">
                <InfoRow
                  label="Single Placement"
                  value={student.single_placement ? "Yes" : "No"}
                />
              </div>
              <div className="py-1">
                <InfoRow
                  label="Double Placement"
                  value={student.double_placement ? "Yes" : "No"}
                />
              </div>
              {student.states && student.states.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Preferred States:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {student.states.map((state, index) => (
                      <Badge key={index} variant="outline">
                        {state}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {student.local_coordinator && (
                <InfoRow
                  label="Local Coordinator"
                  value={student.local_coordinator}
                />
              )}
            </CardContent>
          </Card>

          {/* Interests & Activities */}
          <Card>
            <CardHeader className="border-l-4 border-red-500 pl-4 bg-gradient-to-r from-red-50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-600 mt-2" />
                Interests & Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.selected_interests &&
                student.selected_interests.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      Selected Interests:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {student.selected_interests.map((interest, index) => (
                        <Badge key={index} variant="secondary">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              {student.free_text_interests &&
                student.free_text_interests.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      Additional Interests:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {student.free_text_interests.map((interest, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="whitespace-normal break-words"
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Personal Background */}
          <Card>
            <CardHeader className="border-l-4 border-indigo-500 pl-4 bg-gradient-to-r from-indigo-50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5 text-indigo-600 mt-2" />
                Personal Background
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {student.religion && (
                <InfoRow label="Religion" value={student.religion} />
              )}
              {student.religious_frequency !== undefined && (
                <InfoRow
                  label="Religious Frequency"
                  value={student.religious_frequency}
                />
              )}
              {student.family_description && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    Family Description:
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {student.family_description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health & Dietary */}
          <Card>
            <CardHeader className="border-l-4 border-amber-500 pl-4 bg-gradient-to-r from-amber-50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-2" />
                Health & Dietary Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {student.allergy_comments && (
                <InfoRow label="Allergies" value={student.allergy_comments} />
              )}
              {student.dietary_restrictions && (
                <InfoRow
                  label="Dietary Restrictions"
                  value={student.dietary_restrictions}
                />
              )}
              {student.health_comments &&
                student.health_comments.filter((c) => c && c.trim() !== "")
                  .length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      Health Comments:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {student.health_comments
                        .filter((comment) => comment && comment.trim() !== "")
                        .map((comment, index) => (
                          <li key={index} className="text-sm text-slate-600">
                            {comment}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              <InfoRow
                label="Can Live with Pets"
                value={student.live_with_pets ? "Yes" : "No"}
              />
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="lg:col-span-3">
            <CardHeader className="border-l-4 border-cyan-500 pl-4 bg-gradient-to-r from-cyan-50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-600 mt-2" />
                Messages & Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.intro_message && (
                <MessageSection
                  title="Introduction Message"
                  content={student.intro_message}
                />
              )}
              {student.message_to_host_family && (
                <MessageSection
                  title="Message to Host Family"
                  content={student.message_to_host_family}
                />
              )}
              {student.message_from_natural_family && (
                <MessageSection
                  title="Message from Natural Family"
                  content={student.message_from_natural_family}
                />
              )}
              {student.photo_comments && (
                <MessageSection
                  title="Photo Comments"
                  content={student.photo_comments}
                />
              )}
            </CardContent>
          </Card>

          {/* Media */}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm font-semibold text-slate-700 min-w-fit">
        {label}:
      </span>
      <span className="text-sm text-slate-600 text-right">{String(value)}</span>
    </div>
  );
}

function MessageSection({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-2">{title}:</p>
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-sm text-slate-600 leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
