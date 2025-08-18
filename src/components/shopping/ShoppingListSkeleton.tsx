import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ShoppingListHeaderSkeleton = () => (
  <div className="space-y-4">
    {/* Title and buttons */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>

    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* In-store mode card */}
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  </div>
);

export const ShoppingListSearchSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full" />
    <div className="flex items-center gap-2 flex-wrap">
      <Skeleton className="w-4 h-4" />
      <Skeleton className="h-10 w-44" />
      <div className="flex items-center gap-2">
        <Skeleton className="w-10 h-5 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  </div>
);

export const ShoppingListItemSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="w-8 h-8" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ShoppingSectionSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8" />
            <div className="space-y-1">
              <Skeleton className="h-6 w-36" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="w-8 h-8" />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </CardHeader>
    
    <CardContent className="pt-0 space-y-3">
      {[...Array(3)].map((_, i) => (
        <ShoppingListItemSkeleton key={i} />
      ))}
    </CardContent>
  </Card>
);

export const ShoppingListSkeleton = () => (
  <div className="p-4 space-y-4 pb-20">
    <ShoppingListHeaderSkeleton />
    <ShoppingListSearchSkeleton />
    
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <ShoppingSectionSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const InStoreShoppingSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Sticky Header */}
    <div className="sticky top-0 bg-white border-b z-50 shadow-sm">
      <div className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="w-8 h-8 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-8 w-10" />
          </div>
        </div>
        
        {/* Progress and stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
          
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
        
        {/* Current section */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
    
    {/* Shopping Sections */}
    <div className="p-4 space-y-6 pb-20">
      {[...Array(4)].map((_, i) => (
        <ShoppingSectionSkeleton key={i} />
      ))}
    </div>

    {/* Floating button */}
    <div className="fixed bottom-6 right-6">
      <Skeleton className="w-14 h-14 rounded-full" />
    </div>
  </div>
);

export default ShoppingListSkeleton;