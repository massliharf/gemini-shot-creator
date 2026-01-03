import { useState, useRef, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";
import { PackData, normalizeSceneId } from "./usePacks";

export interface CloudOperationState {
  isActive: boolean;
  type: 'export' | 'delete' | null;
  phase: string;
  currentItem: number;
  totalItems: number;
  currentFile?: string;
  downloadUrl?: string;
  downloadFilename?: string;
  isPaused?: boolean;
  awaitingConfirm?: boolean;
}

interface UseCloudOperationsProps {
  user: User | null;
  packs: Map<string, PackData>;
  setPacks: React.Dispatch<React.SetStateAction<Map<string, PackData>>>;
  setSelectedPackId: React.Dispatch<React.SetStateAction<string | null>>;
  clearReferenceImages: () => void;
}

export const useCloudOperations = ({
  user,
  packs,
  setPacks,
  setSelectedPackId,
  clearReferenceImages,
}: UseCloudOperationsProps) => {
  const [cloudOperation, setCloudOperation] = useState<CloudOperationState>({
    isActive: false,
    type: null,
    phase: '',
    currentItem: 0,
    totalItems: 0,
  });

  const exportPausedRef = useRef(false);
  const exportResolveRef = useRef<(() => void) | null>(null);

  const downloadAllCloudData = useCallback(async () => {
    if (!user) return;

    try {
      setCloudOperation({
        isActive: true,
        type: 'export',
        phase: 'Preparing export...',
        currentItem: 0,
        totalItems: 0,
      });

      const pageSize = 1000;

      const fetchAllRows = async (table: 'packs' | 'generation_queue') => {
        const all: any[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', user.id)
            .range(from, from + pageSize - 1);

          if (error) throw error;
          all.push(...(data ?? []));
          if (!data || data.length < pageSize) break;
          from += pageSize;
        }
        return all;
      };

      setCloudOperation(prev => ({ ...prev, phase: 'Fetching database records...', currentFile: undefined }));
      const [packsRows, queueRows] = await Promise.all([
        fetchAllRows('packs'),
        fetchAllRows('generation_queue'),
      ]);

      const buildBaseZip = (zip: JSZip) => {
        const dataFolder = zip.folder('data');
        dataFolder?.file('packs.json', JSON.stringify(packsRows, null, 2));
        dataFolder?.file('generation_queue.json', JSON.stringify(queueRows, null, 2));

        const packsFolder = zip.folder('packs');
        for (const row of packsRows) {
          const packFile = row.pack_data;
          const meta = packFile?.meta;
          const packName = meta?.package_id || meta?.package_name || row.pack_id || row.pack_name || 'pack';
          packsFolder?.folder(String(packName))?.file('pack.json', JSON.stringify(packFile, null, 2));
        }
      };

      setCloudOperation(prev => ({ ...prev, phase: 'Scanning storage...', currentFile: undefined }));

      const listFolderFilesRecursively = async (prefix: string): Promise<string[]> => {
        const limit = 100;
        let offset = 0;
        const files: string[] = [];

        while (true) {
          const { data, error } = await supabase.storage
            .from('generated-images')
            .list(prefix || undefined, { limit, offset, sortBy: { column: 'name', order: 'asc' } } as any);

          if (error) throw error;
          if (!data || data.length === 0) break;

          for (const item of data) {
            const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
            if ((item as any).metadata === null) {
              const nested = await listFolderFilesRecursively(itemPath);
              files.push(...nested);
            } else {
              files.push(itemPath);
            }
          }

          if (data.length < limit) break;
          offset += limit;
        }

        return files;
      };

      const topLevel = await supabase.storage
        .from('generated-images')
        .list(undefined, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } } as any);

      if (topLevel.error) throw topLevel.error;

      const topFolders = (topLevel.data ?? [])
        .filter((it) => (it as any).metadata === null)
        .map((it) => it.name);

      const rootFiles = (topLevel.data ?? [])
        .filter((it) => (it as any).metadata !== null)
        .map((it) => it.name);

      const foldersToProcess = [...(rootFiles.length ? ['_root'] : []), ...topFolders];

      if (foldersToProcess.length === 0) {
        toast.error('No storage files found');
        setCloudOperation({ isActive: false, type: null, phase: '', currentItem: 0, totalItems: 0 });
        return;
      }

      const folderBatchSize = 25;
      const concurrency = 6;
      let processedFolders = 0;

      setCloudOperation(prev => ({
        ...prev,
        phase: 'Preparing folder batches...',
        totalItems: foldersToProcess.length,
        currentItem: 0,
        currentFile: undefined,
      }));

      const deletePathsInChunks = async (paths: string[]) => {
        const chunkSize = 50;
        for (let i = 0; i < paths.length; i += chunkSize) {
          const chunk = paths.slice(i, i + chunkSize);
          const { error } = await supabase.storage.from('generated-images').remove(chunk);
          if (error) throw error;
        }
      };

      const waitForUserConfirm = async () => {
        exportPausedRef.current = true;
        setCloudOperation(prev => ({ ...prev, isPaused: true, awaitingConfirm: true }));
        await new Promise<void>((resolve) => {
          exportResolveRef.current = resolve;
        });
        setCloudOperation(prev => ({ ...prev, isPaused: false, awaitingConfirm: false }));
      };

      for (let batchStart = 0; batchStart < foldersToProcess.length; batchStart += folderBatchSize) {
        const batchEnd = Math.min(batchStart + folderBatchSize, foldersToProcess.length);
        const folderBatch = foldersToProcess.slice(batchStart, batchEnd);
        const batchNumber = Math.floor(batchStart / folderBatchSize) + 1;
        const totalBatches = Math.ceil(foldersToProcess.length / folderBatchSize);

        setCloudOperation(prev => ({
          ...prev,
          phase: `Batch ${batchNumber}/${totalBatches}: Scanning ${folderBatch.length} folders...`,
          currentFile: undefined,
        }));

        const batchFilePaths: string[] = [];
        for (const folder of folderBatch) {
          if (folder === '_root') {
            batchFilePaths.push(...rootFiles);
            continue;
          }
          const files = await listFolderFilesRecursively(folder);
          batchFilePaths.push(...files);
        }

        const zip = new JSZip();
        buildBaseZip(zip);
        const storageRoot = zip.folder('storage')?.folder('generated-images');
        let storageFilesExported = 0;

        const downloadWithConcurrency = async (
          paths: string[],
          onEach?: (path: string, idx: number, total: number) => void
        ) => {
          const queue = [...paths];
          let idx = 0;

          const worker = async () => {
            while (queue.length) {
              const path = queue.shift();
              if (!path) return;
              const localIdx = idx++;
              onEach?.(path, localIdx, paths.length);

              const { data: blob, error } = await supabase.storage
                .from('generated-images')
                .download(path);

              if (error) {
                console.warn('Failed to download storage file:', path, error);
                continue;
              }

              storageRoot?.file(path, blob);
              storageFilesExported++;
            }
          };

          await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
        };

        if (batchFilePaths.length > 0) {
          setCloudOperation(prev => ({
            ...prev,
            phase: `Batch ${batchNumber}/${totalBatches}: Downloading files...`,
            currentFile: undefined,
          }));

          await downloadWithConcurrency(batchFilePaths, (path) => {
            setCloudOperation(prev => ({
              ...prev,
              currentFile: path,
            }));
          });
        }

        setCloudOperation(prev => ({
          ...prev,
          phase: `Batch ${batchNumber}/${totalBatches}: Creating ZIP...`,
          currentFile: undefined,
        }));

        zip.file(
          'export-metadata.json',
          JSON.stringify(
            {
              exportDate: new Date().toISOString(),
              userId: user.id,
              email: user.email,
              db: { packs: packsRows.length, generation_queue: queueRows.length },
              storage: { bucket: 'generated-images', filesInThisBatch: storageFilesExported },
              batch: { number: batchNumber, total: totalBatches },
            },
            null,
            2
          )
        );

        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        const url = URL.createObjectURL(zipBlob);
        const filename = `lumra-cloud-export-batch-${String(batchNumber).padStart(2, '0')}-of-${String(totalBatches).padStart(2, '0')}.zip`;

        setCloudOperation(prev => ({
          ...prev,
          phase: `Batch ${batchNumber}/${totalBatches}: ZIP hazır. İndirip onaylayın.`,
          currentFile: undefined,
          downloadUrl: url,
          downloadFilename: filename,
          awaitingConfirm: true,
          isPaused: true,
        }));

        await waitForUserConfirm();

        setCloudOperation(prev => ({
          ...prev,
          phase: `Batch ${batchNumber}/${totalBatches}: Deleting from cloud...`,
          currentFile: batchFilePaths[0],
        }));

        if (batchFilePaths.length > 0) {
          await deletePathsInChunks(batchFilePaths);
        }

        processedFolders += folderBatch.length;
        setCloudOperation(prev => ({
          ...prev,
          phase: `Completed batch ${batchNumber}/${totalBatches}`,
          currentItem: processedFolders,
          currentFile: undefined,
        }));
      }

      setCloudOperation({ isActive: false, type: null, phase: '', currentItem: 0, totalItems: 0 });
      toast.success('Cloud export tamamlandı');
    } catch (error) {
      console.error('Export error:', error);
      setCloudOperation({ isActive: false, type: null, phase: '', currentItem: 0, totalItems: 0 });
      toast.error('Failed to export all cloud data');
    }
  }, [user]);

  const deleteAllCloudData = useCallback(async () => {
    if (!user) return;

    try {
      setCloudOperation({
        isActive: true,
        type: 'delete',
        phase: 'Scanning storage...',
        currentItem: 0,
        totalItems: 0,
      });

      const allPaths: string[] = [];
      
      const listAllStoragePaths = async (prefix: string): Promise<void> => {
        const limit = 100;
        let offset = 0;

        while (true) {
          const { data, error } = await supabase.storage
            .from('generated-images')
            .list(prefix || undefined, { limit, offset, sortBy: { column: 'name', order: 'asc' } } as any);

          if (error) throw error;
          if (!data || data.length === 0) break;

          for (const item of data) {
            const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
            if ((item as any).metadata === null) {
              await listAllStoragePaths(itemPath);
            } else {
              allPaths.push(itemPath);
              setCloudOperation(prev => ({
                ...prev,
                phase: `Scanning storage... Found ${allPaths.length} files`,
                currentFile: itemPath,
              }));
            }
          }

          if (data.length < limit) break;
          offset += limit;
        }
      };

      await listAllStoragePaths('');

      setCloudOperation(prev => ({
        ...prev,
        phase: 'Deleting files...',
        totalItems: allPaths.length,
        currentItem: 0,
      }));

      const chunkSize = 50;
      for (let i = 0; i < allPaths.length; i += chunkSize) {
        const chunk = allPaths.slice(i, i + chunkSize);
        setCloudOperation(prev => ({
          ...prev,
          currentItem: Math.min(i + chunkSize, allPaths.length),
          currentFile: chunk[0],
        }));

        const { error } = await supabase.storage.from('generated-images').remove(chunk);
        if (error) throw error;
      }

      setCloudOperation(prev => ({
        ...prev,
        phase: 'Deleting database records...',
        currentFile: undefined,
      }));

      const { error: queueErr } = await supabase
        .from('generation_queue')
        .delete()
        .eq('user_id', user.id);
      if (queueErr) throw queueErr;

      const { error: packsErr } = await supabase
        .from('packs')
        .delete()
        .eq('user_id', user.id);
      if (packsErr) throw packsErr;

      setPacks(new Map());
      setSelectedPackId(null);
      clearReferenceImages();

      setCloudOperation({ isActive: false, type: null, phase: '', currentItem: 0, totalItems: 0 });
      toast.success('All cloud data deleted');
    } catch (error) {
      console.error('Delete all cloud data error:', error);
      setCloudOperation({ isActive: false, type: null, phase: '', currentItem: 0, totalItems: 0 });
      toast.error('Failed to delete all cloud data');
    }
  }, [user, setPacks, setSelectedPackId, clearReferenceImages]);

  const handleCloudOperationClose = useCallback(() => {
    if (cloudOperation.downloadUrl) {
      try {
        URL.revokeObjectURL(cloudOperation.downloadUrl);
      } catch {
        // ignore
      }
    }
    exportPausedRef.current = false;
    exportResolveRef.current = null;
    setCloudOperation({ isActive: false, type: null, phase: '', currentItem: 0, totalItems: 0 });
  }, [cloudOperation.downloadUrl]);

  const handleCloudOperationPause = useCallback(() => {
    exportPausedRef.current = true;
    setCloudOperation(prev => ({ ...prev, isPaused: true }));
  }, []);

  const handleCloudOperationResume = useCallback(() => {
    exportPausedRef.current = false;
    if (exportResolveRef.current) {
      exportResolveRef.current();
      exportResolveRef.current = null;
    }
  }, []);

  const handleCloudOperationConfirm = useCallback(() => {
    if (cloudOperation.downloadUrl) {
      try {
        URL.revokeObjectURL(cloudOperation.downloadUrl);
      } catch {
        // ignore
      }
    }
    setCloudOperation(prev => ({
      ...prev,
      downloadUrl: undefined,
      downloadFilename: undefined,
      awaitingConfirm: false,
      isPaused: false,
    }));
    exportPausedRef.current = false;
    if (exportResolveRef.current) {
      exportResolveRef.current();
      exportResolveRef.current = null;
    }
  }, [cloudOperation.downloadUrl]);

  return {
    cloudOperation,
    downloadAllCloudData,
    deleteAllCloudData,
    handleCloudOperationClose,
    handleCloudOperationPause,
    handleCloudOperationResume,
    handleCloudOperationConfirm,
  };
};
