"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function EditCourseClient({ id }: { id: string }) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [university, setUniversity] = useState("");
  const [description, setDescription] = useState("");
  
  // Individual prices
  const [summaryPrice, setSummaryPrice] = useState("");
  const [explanationPrice, setExplanationPrice] = useState("");
  const [podcastPrice, setPodcastPrice] = useState("");
  
  // Combo prices
  const [comboSummaryPodcastPrice, setComboSummaryPodcastPrice] = useState("");
  const [comboSummaryExplanationPrice, setComboSummaryExplanationPrice] = useState("");
  const [comboExplanationPodcastPrice, setComboExplanationPodcastPrice] = useState("");
  const [comboAllPrice, setComboAllPrice] = useState("");
  
  // Purchase links
  const [summaryLink, setSummaryLink] = useState("");
  const [explanationLink, setExplanationLink] = useState("");
  const [podcastLink, setPodcastLink] = useState("");
  const [comboSummaryPodcastLink, setComboSummaryPodcastLink] = useState("");
  const [comboSummaryExplanationLink, setComboSummaryExplanationLink] = useState("");
  const [comboExplanationPodcastLink, setComboExplanationPodcastLink] = useState("");
  const [comboAllLink, setComboAllLink] = useState("");
  
  const [formats, setFormats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("id", id)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (data) {
          // Set basic details
          setTitle(data.title || "");
          setCode(data.code || "");
          setFaculty(data.faculty || "");
          setDepartment(data.department || "");
          setUniversity(data.university || "");
          setDescription(data.description || "");
          
          // Set formats
          setFormats(data.formats || []);
          
          // Set individual prices
          setSummaryPrice(data.summary_price ? String(data.summary_price) : "");
          setExplanationPrice(data.explanation_price ? String(data.explanation_price) : "");
          setPodcastPrice(data.podcast_price ? String(data.podcast_price) : "");
          
          // Set combo prices
          setComboSummaryPodcastPrice(data.combo_summary_podcast_price ? String(data.combo_summary_podcast_price) : "");
          setComboSummaryExplanationPrice(data.combo_summary_explanation_price ? String(data.combo_summary_explanation_price) : "");
          setComboExplanationPodcastPrice(data.combo_explanation_podcast_price ? String(data.combo_explanation_podcast_price) : "");
          setComboAllPrice(data.combo_all_price ? String(data.combo_all_price) : "");
          
          // Set purchase links
          setSummaryLink(data.summary_link || "");
          setExplanationLink(data.explanation_link || "");
          setPodcastLink(data.podcast_link || "");
          setComboSummaryPodcastLink(data.combo_summary_podcast_link || "");
          setComboSummaryExplanationLink(data.combo_summary_explanation_link || "");
          setComboExplanationPodcastLink(data.combo_explanation_podcast_link || "");
          setComboAllLink(data.combo_all_link || "");
        }
      } catch (error: any) {
        console.error("Error fetching course:", error);
        toast({
          title: "Error",
          description: "Failed to load course details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id, toast, supabase]);

  const handleFormatChange = (format: string, checked: boolean) => {
    if (checked) {
      setFormats([...formats, format]);
    } else {
      setFormats(formats.filter((f) => f !== format));
    }
  };

  const handleFacultyChange = (value: string) => {
    console.log('Faculty changed to:', value);
    setFaculty(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Validate form
      if (!title || !code || !faculty || !department || !university || formats.length === 0) {
        throw new Error("Please fill in all required fields");
      }

      console.log("Form data being sent:", {
        title,
        code,
        faculty,
        department,
        university,
      });

      // Validate prices based on selected formats
      if (formats.includes("summary") && (!summaryPrice || isNaN(Number(summaryPrice)) || Number(summaryPrice) <= 0)) {
        throw new Error("Please enter a valid price for Summary format");
      }
      if (formats.includes("explanation") && (!explanationPrice || isNaN(Number(explanationPrice)) || Number(explanationPrice) <= 0)) {
        throw new Error("Please enter a valid price for Explanation format");
      }
      if (formats.includes("podcast") && (!podcastPrice || isNaN(Number(podcastPrice)) || Number(podcastPrice) <= 0)) {
        throw new Error("Please enter a valid price for Podcast format");
      }

      // Check combo prices if applicable
      const hasSummaryAndPodcast = formats.includes("summary") && formats.includes("podcast");
      const hasSummaryAndExplanation = formats.includes("summary") && formats.includes("explanation");
      const hasExplanationAndPodcast = formats.includes("explanation") && formats.includes("podcast");
      const hasAllFormats = formats.includes("summary") && formats.includes("explanation") && formats.includes("podcast");

      // Create the course data object
      const courseData = {
        title,
        code, // Changed from 'course_code' back to 'code' to match the actual database column name
        faculty,
        department,
        university,
        description,
        formats,
        
        // Individual prices
        summary_price: formats.includes("summary") ? Number(summaryPrice) : null,
        explanation_price: formats.includes("explanation") ? Number(explanationPrice) : null,
        podcast_price: formats.includes("podcast") ? Number(podcastPrice) : null,
        
        // Combo prices
        combo_summary_podcast_price: hasSummaryAndPodcast ? Number(comboSummaryPodcastPrice) || null : null,
        combo_summary_explanation_price: hasSummaryAndExplanation ? Number(comboSummaryExplanationPrice) || null : null,
        combo_explanation_podcast_price: hasExplanationAndPodcast ? Number(comboExplanationPodcastPrice) || null : null,
        combo_all_price: hasAllFormats ? Number(comboAllPrice) || null : null,
        
        // Purchase links
        summary_link: formats.includes("summary") ? summaryLink || null : null,
        explanation_link: formats.includes("explanation") ? explanationLink || null : null,
        podcast_link: formats.includes("podcast") ? podcastLink || null : null,
        combo_summary_podcast_link: hasSummaryAndPodcast ? comboSummaryPodcastLink || null : null,
        combo_summary_explanation_link: hasSummaryAndExplanation ? comboSummaryExplanationLink || null : null,
        combo_explanation_podcast_link: hasExplanationAndPodcast ? comboExplanationPodcastLink || null : null,
        combo_all_link: hasAllFormats ? comboAllLink || null : null,
        
        // Add updated timestamp
        updated_at: new Date().toISOString(),
      };

      // Update course in database
      const { error } = await supabase
        .from("courses")
        .update(courseData)
        .eq("id", id);

      if (error) {
        console.error("Supabase update error:", error);
        throw new Error(error.message || "Failed to update course in database");
      }

      toast({
        title: "Course updated",
        description: "The course has been updated successfully.",
      });

      // Navigate back to admin dashboard
      router.push("/admin/courses");
    } catch (error: any) {
      console.error("Error details:", error);
      toast({
        title: "Error updating course",
        description: error.message || "An error occurred while updating the course.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading course details...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/admin/courses">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Course</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
          <CardDescription>Update the details for this course</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="details">Basic Details</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Links</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <TabsContent value="details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Course Title *</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">Course Code *</Label>
                    <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="university">University *</Label>
                    <Input id="university" value={university} onChange={(e) => setUniversity(e.target.value)} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="faculty">Faculty *</Label>
                    <Select value={faculty} onValueChange={handleFacultyChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select faculty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medicine">Medicine</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Computing">Computing</SelectItem>
                        <SelectItem value="Law">Law</SelectItem>
                        <SelectItem value="Arts">Arts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2 mt-6">
                  <Label htmlFor="description">Course Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-4 mt-6">
                  <Label>Available Formats *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="summary"
                        checked={formats.includes("summary")}
                        onCheckedChange={(checked) => handleFormatChange("summary", checked as boolean)}
                      />
                      <Label htmlFor="summary" className="cursor-pointer">
                        Summary
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="explanation"
                        checked={formats.includes("explanation")}
                        onCheckedChange={(checked) => handleFormatChange("explanation", checked as boolean)}
                      />
                      <Label htmlFor="explanation" className="cursor-pointer">
                        Explanation
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="podcast"
                        checked={formats.includes("podcast")}
                        onCheckedChange={(checked) => handleFormatChange("podcast", checked as boolean)}
                      />
                      <Label htmlFor="podcast" className="cursor-pointer">
                        Podcast
                      </Label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button type="button" onClick={() => setActiveTab("pricing")} disabled={formats.length === 0}>
                    Continue to Pricing
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="pricing">
                <div className="space-y-8">
                  {/* Individual prices section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Individual Prices</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {formats.includes("summary") && (
                        <div className="space-y-2">
                          <Label htmlFor="summaryPrice">Summary Price (₦) *</Label>
                          <Input
                            id="summaryPrice"
                            type="number"
                            min="0"
                            step="100"
                            value={summaryPrice}
                            onChange={(e) => setSummaryPrice(e.target.value)}
                            required
                          />
                        </div>
                      )}
                      
                      {formats.includes("explanation") && (
                        <div className="space-y-2">
                          <Label htmlFor="explanationPrice">Explanation Price (₦) *</Label>
                          <Input
                            id="explanationPrice"
                            type="number"
                            min="0"
                            step="100"
                            value={explanationPrice}
                            onChange={(e) => setExplanationPrice(e.target.value)}
                            required
                          />
                        </div>
                      )}
                      
                      {formats.includes("podcast") && (
                        <div className="space-y-2">
                          <Label htmlFor="podcastPrice">Podcast Price (₦) *</Label>
                          <Input
                            id="podcastPrice"
                            type="number"
                            min="0"
                            step="100"
                            value={podcastPrice}
                            onChange={(e) => setPodcastPrice(e.target.value)}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Combo prices section */}
                  {(formats.length >= 2) && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-lg font-medium">Combo Prices</h3>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Combo prices are optional but recommended to offer discounts for multiple formats.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {formats.includes("summary") && formats.includes("podcast") && (
                          <div className="space-y-2">
                            <Label htmlFor="comboSummaryPodcastPrice">Summary + Podcast Price (₦)</Label>
                            <Input
                              id="comboSummaryPodcastPrice"
                              type="number"
                              min="0"
                              step="100"
                              value={comboSummaryPodcastPrice}
                              onChange={(e) => setComboSummaryPodcastPrice(e.target.value)}
                            />
                          </div>
                        )}
                        
                        {formats.includes("summary") && formats.includes("explanation") && (
                          <div className="space-y-2">
                            <Label htmlFor="comboSummaryExplanationPrice">Summary + Explanation Price (₦)</Label>
                            <Input
                              id="comboSummaryExplanationPrice"
                              type="number"
                              min="0"
                              step="100"
                              value={comboSummaryExplanationPrice}
                              onChange={(e) => setComboSummaryExplanationPrice(e.target.value)}
                            />
                          </div>
                        )}
                        
                        {formats.includes("explanation") && formats.includes("podcast") && (
                          <div className="space-y-2">
                            <Label htmlFor="comboExplanationPodcastPrice">Explanation + Podcast Price (₦)</Label>
                            <Input
                              id="comboExplanationPodcastPrice"
                              type="number"
                              min="0"
                              step="100"
                              value={comboExplanationPodcastPrice}
                              onChange={(e) => setComboExplanationPodcastPrice(e.target.value)}
                            />
                          </div>
                        )}
                        
                        {formats.length === 3 && (
                          <div className="space-y-2">
                            <Label htmlFor="comboAllPrice">All Formats Price (₦)</Label>
                            <Input
                              id="comboAllPrice"
                              type="number"
                              min="0"
                              step="100"
                              value={comboAllPrice}
                              onChange={(e) => setComboAllPrice(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Purchase links section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-medium">Purchase Links</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Add external payment or purchase links for each format and combo.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    {/* Individual format links */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-500">Individual Format Links</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {formats.includes("summary") && (
                          <div className="space-y-2">
                            <Label htmlFor="summaryLink">Summary Purchase Link</Label>
                            <Input
                              id="summaryLink"
                              type="url"
                              placeholder="https://..."
                              value={summaryLink}
                              onChange={(e) => setSummaryLink(e.target.value)}
                            />
                          </div>
                        )}
                        
                        {formats.includes("explanation") && (
                          <div className="space-y-2">
                            <Label htmlFor="explanationLink">Explanation Purchase Link</Label>
                            <Input
                              id="explanationLink"
                              type="url"
                              placeholder="https://..."
                              value={explanationLink}
                              onChange={(e) => setExplanationLink(e.target.value)}
                            />
                          </div>
                        )}
                        
                        {formats.includes("podcast") && (
                          <div className="space-y-2">
                            <Label htmlFor="podcastLink">Podcast Purchase Link</Label>
                            <Input
                              id="podcastLink"
                              type="url"
                              placeholder="https://..."
                              value={podcastLink}
                              onChange={(e) => setPodcastLink(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Combo format links */}
                    {formats.length >= 2 && (
                      <div className="space-y-4 mt-6">
                        <h4 className="text-sm font-medium text-gray-500">Combo Format Links</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {formats.includes("summary") && formats.includes("podcast") && (
                            <div className="space-y-2">
                              <Label htmlFor="comboSummaryPodcastLink">Summary + Podcast Purchase Link</Label>
                              <Input
                                id="comboSummaryPodcastLink"
                                type="url"
                                placeholder="https://..."
                                value={comboSummaryPodcastLink}
                                onChange={(e) => setComboSummaryPodcastLink(e.target.value)}
                              />
                            </div>
                          )}
                          
                          {formats.includes("summary") && formats.includes("explanation") && (
                            <div className="space-y-2">
                              <Label htmlFor="comboSummaryExplanationLink">Summary + Explanation Purchase Link</Label>
                              <Input
                                id="comboSummaryExplanationLink"
                                type="url"
                                placeholder="https://..."
                                value={comboSummaryExplanationLink}
                                onChange={(e) => setComboSummaryExplanationLink(e.target.value)}
                              />
                            </div>
                          )}
                          
                          {formats.includes("explanation") && formats.includes("podcast") && (
                            <div className="space-y-2">
                              <Label htmlFor="comboExplanationPodcastLink">Explanation + Podcast Purchase Link</Label>
                              <Input
                                id="comboExplanationPodcastLink"
                                type="url"
                                placeholder="https://..."
                                value={comboExplanationPodcastLink}
                                onChange={(e) => setComboExplanationPodcastLink(e.target.value)}
                              />
                            </div>
                          )}
                          
                          {formats.length === 3 && (
                            <div className="space-y-2">
                              <Label htmlFor="comboAllLink">All Formats Purchase Link</Label>
                              <Input
                                id="comboAllLink"
                                type="url"
                                placeholder="https://..."
                                value={comboAllLink}
                                onChange={(e) => setComboAllLink(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between mt-8">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("details")}>
                    Back to Details
                  </Button>
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" asChild>
                      <Link href="/admin/courses">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}