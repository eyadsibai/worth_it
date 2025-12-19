"use client";

import { X, History, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useVersionHistory, useVersionDiff } from "./use-version-history";
import { VersionListItem } from "./version-list-item";
import { VersionDiffView } from "./version-diff-view";
import type { CapTableSnapshot } from "./types";

interface VersionHistoryPanelProps {
  currentSnapshot?: CapTableSnapshot;
  onRestore: (snapshot: CapTableSnapshot) => void;
}

export function VersionHistoryPanel({
  currentSnapshot,
  onRestore,
}: VersionHistoryPanelProps) {
  const {
    versions,
    isHistoryPanelOpen,
    selectedVersionId,
    closeHistoryPanel,
    selectVersion,
    restoreVersion,
    deleteVersion,
    clearAllVersions,
  } = useVersionHistory();

  const diff = useVersionDiff(currentSnapshot);

  const handleRestore = (versionId: string) => {
    const snapshot = restoreVersion(versionId);
    if (snapshot) {
      onRestore(snapshot);
      closeHistoryPanel();
    }
  };

  const handleDelete = (versionId: string) => {
    deleteVersion(versionId);
  };

  return (
    <AnimatePresence>
      {isHistoryPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={closeHistoryPanel}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Version History</h2>
              </div>
              <div className="flex items-center gap-2">
                {versions.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear all versions?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all {versions.length} saved versions.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={clearAllVersions}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeHistoryPanel}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {versions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No versions yet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Versions are automatically saved when you make significant changes
                    like adding stakeholders or funding rounds.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex min-h-0">
                  {/* Version list */}
                  <ScrollArea className="flex-1 border-r">
                    <div className="p-4 space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                        {versions.length} version{versions.length !== 1 ? "s" : ""} saved
                      </p>
                      {versions.map((version) => (
                        <VersionListItem
                          key={version.id}
                          version={version}
                          isSelected={version.id === selectedVersionId}
                          onSelect={() =>
                            selectVersion(
                              version.id === selectedVersionId ? null : version.id
                            )
                          }
                          onRestore={() => handleRestore(version.id)}
                          onDelete={() => handleDelete(version.id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Diff view */}
                  <div className="w-1/2 flex flex-col">
                    {selectedVersionId && diff ? (
                      <ScrollArea className="flex-1">
                        <div className="p-4">
                          <h3 className="text-sm font-medium mb-3">
                            Changes from this version
                          </h3>
                          <VersionDiffView diff={diff} />
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-center px-6">
                        <p className="text-sm text-muted-foreground">
                          Select a version to see what changed
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
