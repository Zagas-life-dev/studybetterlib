"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileText, BookOpen, Headphones, CheckCircle, ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Checkbox } from "@/components/ui/checkbox"
import { addToCart } from "@/app/actions/cart" 

interface CourseCardProps {
  course: {
    id: string
    title: string
    code: string
    faculty: string
    department?: string
    university?: string
    description?: string
    summary_price?: number
    explanation_price?: number
    podcast_price?: number
    combo_summary_podcast_price?: number
    combo_summary_explanation_price?: number
    combo_explanation_podcast_price?: number
    combo_all_price?: number
    summary_link?: string
    explanation_link?: string
    podcast_link?: string
    combo_summary_podcast_link?: string
    combo_summary_explanation_link?: string
    combo_explanation_podcast_link?: string
    combo_all_link?: string
    formats: string[]
  }
}

export default function CourseCard({ course }: CourseCardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  
  // State for selected formats and UI states
  const [selectedFormats, setSelectedFormats] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [completed, setCompleted] = useState(false)

  // Calculate prices based on selections
  const calculatePrices = () => {
    // If no formats selected, return zeroes
    if (selectedFormats.length === 0) return { individualTotal: 0, comboPrice: null };

    // Calculate individual prices total
    const individualTotal = selectedFormats.reduce((total, format) => {
      if (format === "summary" && course.summary_price) {
        return total + course.summary_price;
      } else if (format === "explanation" && course.explanation_price) {
        return total + course.explanation_price;
      } else if (format === "podcast" && course.podcast_price) {
        return total + course.podcast_price;
      }
      return total;
    }, 0);

    // Check for applicable combo price
    let comboPrice = null;
    const hasSummary = selectedFormats.includes("summary");
    const hasExplanation = selectedFormats.includes("explanation");
    const hasPodcast = selectedFormats.includes("podcast");

    if (hasSummary && hasExplanation && hasPodcast && course.combo_all_price) {
      comboPrice = course.combo_all_price;
    } else if (hasSummary && hasExplanation && course.combo_summary_explanation_price) {
      comboPrice = course.combo_summary_explanation_price;
    } else if (hasSummary && hasPodcast && course.combo_summary_podcast_price) {
      comboPrice = course.combo_summary_podcast_price;
    } else if (hasExplanation && hasPodcast && course.combo_explanation_podcast_price) {
      comboPrice = course.combo_explanation_podcast_price;
    }

    return { individualTotal, comboPrice };
  };
  
  const { individualTotal, comboPrice } = calculatePrices();
  const finalPrice = comboPrice !== null ? comboPrice : individualTotal;
  const hasDiscount = comboPrice !== null && comboPrice < individualTotal;

  // Handle format selection
  const handleFormatToggle = (format: string) => {
    setSelectedFormats(prev => 
      prev.includes(format) 
        ? prev.filter(f => f !== format) 
        : [...prev, format]
    );
  };

  const handleBuy = async () => {
    if (selectedFormats.length === 0) {
      toast({
        title: "No formats selected",
        description: "Please select at least one format.",
        variant: "destructive",
      });
      return;
    }
    
    setProcessing(true);
    
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
  
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to purchase courses.",
          variant: "destructive",
        });
        router.push("/login");
        setProcessing(false);
        return;
      }
      const hasSummary = selectedFormats.includes("summary");
      const hasExplanation = selectedFormats.includes("explanation");
      const hasPodcast = selectedFormats.includes("podcast");
      // Determine purchase link based on selected formats
      let purchaseLink = null;
      if (hasSummary && hasExplanation && hasPodcast && course.combo_all_link) {
        purchaseLink = course.combo_all_link;
      } else if (hasSummary && hasExplanation && course.combo_summary_explanation_link) {
        purchaseLink = course.combo_summary_explanation_link;
      } else if (hasSummary && hasPodcast && course.combo_summary_podcast_link) {
        purchaseLink = course.combo_summary_podcast_link;
      } else if (hasExplanation && hasPodcast && course.combo_explanation_podcast_link) {
        purchaseLink = course.combo_explanation_podcast_link;
      } else if (hasSummary && course.summary_link) {
        purchaseLink = course.summary_link;
      } else if (hasExplanation && course.explanation_link) {
        purchaseLink = course.explanation_link;
      } else if (hasPodcast && course.podcast_link) {
        purchaseLink = course.podcast_link;
      }
      
      // Redirect to checkout page with purchase information
      if (purchaseLink) {
        router.push(purchaseLink);
      } else {
        throw new Error("Purchase link not available");
      }
      
      // Show temporary success state
      setCompleted(true);
      setTimeout(() => setCompleted(false), 2000);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden flex flex-col">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold">{course.title}</h3>
          <div className="flex flex-col items-end gap-1">
            {course.university && (
              <span className="text-xs bg-blue-900/60 text-blue-300 px-2 py-1 rounded-sm">
                {course.university}
              </span>
            )}
            <span className="text-sm bg-gray-800 px-2 py-1 rounded">
              {course.code}
            </span>
          </div>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-gray-400">{course.faculty}</p>
          {course.department && (
            <p className="text-xs text-gray-500">{course.department}</p>
          )}
        </div>
        
        {course.description && (
          <p className="text-xs text-gray-400 mb-3 line-clamp-2">{course.description}</p>
        )}

        <div className="flex gap-2 mb-4">
          {course.formats.includes("summary") && (
            <div className="flex items-center text-xs text-gray-300">
              <FileText className="h-3 w-3 mr-1" />
              <span>Summary</span>
            </div>
          )}

          {course.formats.includes("explanation") && (
            <div className="flex items-center text-xs text-gray-300">
              <BookOpen className="h-3 w-3 mr-1" />
              <span>Explanation</span>
            </div>
          )}

          {course.formats.includes("podcast") && (
            <div className="flex items-center text-xs text-gray-300">
              <Headphones className="h-3 w-3 mr-1" />
              <span>Podcast</span>
            </div>
          )}
        </div>
        
        {/* Format selection section - Horizontally arranged */}
        {isExpanded && (
          <div className="mt-4 border-t border-gray-800 pt-3">
            <p className="text-xs font-medium text-gray-400 mb-3">Select formats:</p>
            
            {/* Horizontal format selection */}
            <div className="flex flex-wrap gap-3 mb-4">
              {course.formats.map(format => {
                const isSelected = selectedFormats.includes(format);
                let formatIcon;
                let price;
                
                if (format === "summary") {
                  formatIcon = <FileText className="h-4 w-4" />;
                  price = course.summary_price;
                } else if (format === "explanation") {
                  formatIcon = <BookOpen className="h-4 w-4" />;
                  price = course.explanation_price;
                } else if (format === "podcast") {
                  formatIcon = <Headphones className="h-4 w-4" />;
                  price = course.podcast_price;
                }
                
                return (
                  <div 
                    key={format} 
                    className={`border rounded-md p-3 cursor-pointer transition-all w-full sm:w-auto flex-1
                              ${isSelected 
                                ? 'border-purple-500 bg-purple-600/20 shadow-[0_0_10px_rgba(147,51,234,0.3)]' 
                                : 'border-gray-700 hover:border-gray-500'}`}
                    onClick={() => handleFormatToggle(format)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {formatIcon}
                        <span className="text-sm font-medium capitalize">
                          {format}
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                                    ${isSelected 
                                      ? 'border-purple-500 bg-purple-500' 
                                      : 'border-gray-500'}`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                    </div>
                    {price !== undefined && (
                      <p className={`text-sm font-medium mt-1 ${isSelected ? 'text-purple-300' : 'text-gray-400'}`}>
                        ₦{price.toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Display combo prices directly */}
            {selectedFormats.length > 1 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-green-400">Combo price:</span>
                  {hasDiscount && (
                    <span className="text-sm line-through text-gray-500 ml-1">₦{individualTotal.toLocaleString()}</span>
                  )}
                </div>
                
                {hasDiscount ? (
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-green-400">₦{comboPrice?.toLocaleString()}</span>
                    <span className="ml-2 text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded">
                      Save ₦{(individualTotal - (comboPrice || 0)).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-lg font-bold">₦{finalPrice.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto p-5 pt-3 flex items-center justify-between">
        {!isExpanded && (
          <div>
            <p className="text-xs text-gray-400">From</p>
            <p className="text-xl font-bold">
              {course.summary_price !== undefined || course.explanation_price !== undefined || course.podcast_price !== undefined
                ? `₦${Math.min(
                    ...[
                      course.summary_price, 
                      course.explanation_price, 
                      course.podcast_price
                    ].filter(price => price !== undefined && price !== null)
                  ).toLocaleString()}`
                : 'Price unavailable'}
            </p>
          </div>
        )}
        
        {!isExpanded ? (
          <Button 
            onClick={() => setIsExpanded(true)} 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700"
          >
            Choose Options
          </Button>
        ) : (
          <div className="w-full flex gap-2 justify-end">
            <Button 
              onClick={() => {
                setIsExpanded(false);
                setSelectedFormats([]);
              }}
              size="sm" 
              variant="outline"
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBuy} 
              size="sm" 
              className={`${completed ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'}`}
              disabled={selectedFormats.length === 0 || processing}
            >
              {processing ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-1">◌</span> Processing...
                </span>
              ) : completed ? (
                <span className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" /> Purchased
                </span>
              ) : (
                <span className="flex items-center">
                  Buy <ExternalLink className="h-3 w-3 ml-1" />
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
