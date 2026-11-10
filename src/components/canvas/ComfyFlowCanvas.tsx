import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ImageInputNode } from './nodes/ImageInputNode';
import { PromptNode } from './nodes/PromptNode';
import { NanoBananaModelNode } from './nodes/NanoBananaModelNode';
import { OutputPreviewNode } from './nodes/OutputPreviewNode';
import { AspectRatio, ImageModel, LocalReferenceImage, WorkflowImage } from '@/types';
import { Plus, Play, Sparkles, RefreshCw } from 'lucide-react';

interface ComfyFlowCanvasProps {
  referenceImages: LocalReferenceImage[];
  prompt: string;
  aspectRatio: AspectRatio;
  outputCount: number;
  selectedModel: ImageModel;
  results: WorkflowImage[];
  isGenerating: boolean;
  onAddImage: (file: File, roleType: any) => void;
  onRemoveImage: (id: string) => void;
  onUpdateRole: (id: string, roleType: any) => void;
  onPromptChange: (prompt: string) => void;
  onRatioChange: (ratio: AspectRatio) => void;
  onCountChange: (count: number) => void;
  onModelChange: (model: ImageModel) => void;
  onExecute: () => void;
  onPreviewImage: (url: string) => void;
}

export const ComfyFlowCanvas: React.FC<ComfyFlowCanvasProps> = ({
  referenceImages,
  prompt,
  aspectRatio,
  outputCount,
  selectedModel,
  results,
  isGenerating,
  onAddImage,
  onRemoveImage,
  onUpdateRole,
  onPromptChange,
  onRatioChange,
  onCountChange,
  onModelChange,
  onExecute,
  onPreviewImage,
}) => {
  const nodeTypes = useMemo(
    () => ({
      imageInput: ImageInputNode,
      promptNode: PromptNode,
      nanoBananaModel: NanoBananaModelNode,
      outputPreview: OutputPreviewNode,
    }),
    []
  );

  // Initial nodes positioning
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    // Image Nodes on the Left (x: 50)
    referenceImages.forEach((img, idx) => {
      nodes.push({
        id: `img-node-${img.id}`,
        type: 'imageInput',
        position: { x: 50, y: 50 + idx * 270 },
        data: {
          label: `${img.roleType} (#${idx + 1})`,
          roleType: img.roleType,
          previewUrl: img.previewUrl,
          imageFile: img.file,
          onImageChange: (_id: string, file: File, role: any) => onAddImage(file, role),
          onRemove: (id: string) => onRemoveImage(id.replace('img-node-', '')),
          onRoleChange: (id: string, role: any) => onUpdateRole(id.replace('img-node-', ''), role),
        },
      });
    });

    // Always keep an "Empty / Add New Image" node ready at the end
    nodes.push({
      id: `img-node-placeholder-${referenceImages.length}`,
      type: 'imageInput',
      position: { x: 50, y: 50 + referenceImages.length * 270 },
      data: {
        label: referenceImages.length === 0 ? 'Cenário (Fundo)' : `Produto #${referenceImages.length + 1} (Inserção)`,
        roleType: referenceImages.length === 0 ? 'Cenário' : 'Produto',
        onImageChange: (_id: string, file: File, role: any) => onAddImage(file, role),
      },
    });

    // Prompt Node (x: 400, y: 50)
    nodes.push({
      id: 'node-prompt',
      type: 'promptNode',
      position: { x: 400, y: 50 },
      data: {
        prompt,
        onPromptChange,
      },
    });

    // Nano Banana Engine Node (x: 400, y: 300)
    nodes.push({
      id: 'node-model',
      type: 'nanoBananaModel',
      position: { x: 400, y: 300 },
      data: {
        aspectRatio,
        outputCount,
        selectedModel,
        onRatioChange,
        onCountChange,
        onModelChange,
      },
    });

    // Output Node (x: 780, y: 150)
    nodes.push({
      id: 'node-output',
      type: 'outputPreview',
      position: { x: 780, y: 150 },
      data: {
        results,
        isGenerating,
        onPreviewImage,
      },
    });

    return nodes;
  }, [
    referenceImages,
    prompt,
    aspectRatio,
    outputCount,
    selectedModel,
    results,
    isGenerating,
    onAddImage,
    onRemoveImage,
    onUpdateRole,
    onPromptChange,
    onRatioChange,
    onCountChange,
    onModelChange,
    onPreviewImage,
  ]);

  // Initial Edges (Wires between nodes)
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [
      {
        id: 'e-prompt-model',
        source: 'node-prompt',
        sourceHandle: 'prompt-out',
        target: 'node-model',
        targetHandle: 'prompt-in',
        animated: true,
        style: { stroke: '#818cf8', strokeWidth: 2 },
      },
      {
        id: 'e-model-output',
        source: 'node-model',
        sourceHandle: 'image-render-out',
        target: 'node-output',
        targetHandle: 'render-in',
        animated: isGenerating,
        style: { stroke: '#10b981', strokeWidth: 2 },
      },
    ];

    // Connections for each loaded image
    referenceImages.forEach((img, idx) => {
      edges.push({
        id: `e-img-${img.id}-model`,
        source: `img-node-${img.id}`,
        sourceHandle: 'image-out',
        target: 'node-model',
        targetHandle: idx === 0 ? 'scenario-in' : 'product-in',
        animated: true,
        style: { stroke: idx === 0 ? '#34d399' : '#22d3ee', strokeWidth: 2 },
      });
    });

    // Connection for placeholder node
    edges.push({
      id: `e-img-placeholder-model`,
      source: `img-node-placeholder-${referenceImages.length}`,
      sourceHandle: 'image-out',
      target: 'node-model',
      targetHandle: referenceImages.length === 0 ? 'scenario-in' : 'product-in',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 4' },
    });

    return edges;
  }, [referenceImages, isGenerating]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync internal nodes state with external props changes
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        Array.from(e.dataTransfer.files).forEach((file) => {
          if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            const role = referenceImages.length === 0 ? 'Cenário' : 'Produto';
            onAddImage(file, role);
          }
        });
      }
    },
    [onAddImage, referenceImages.length]
  );

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      onDrop={handleCanvasDrop}
      onDragOver={handleCanvasDragOver}
      className="w-full h-[750px] bg-[#0b0c10] border border-surface-border rounded-2xl overflow-hidden shadow-2xl relative"
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <div className="px-4 py-2 rounded-xl bg-surface/90 border border-surface-border backdrop-blur-md shadow-lg flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-white tracking-wide">
            Canvas Interativo de Nós (ComfyUI / Flow)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {referenceImages.length} Imagens Conectadas
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = (e: any) => {
              if (e.target.files && e.target.files[0]) {
                const role = referenceImages.length === 0 ? 'Cenário' : 'Produto';
                onAddImage(e.target.files[0], role);
              }
            };
            fileInput.click();
          }}
          className="px-3.5 py-2 rounded-xl bg-surface/90 hover:bg-surface border border-surface-border text-xs font-medium text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 shadow-md"
        >
          <Plus className="w-3.5 h-3.5 text-primary-light" />
          + Adicionar Mais Um Nó de Imagem
        </button>

        <button
          type="button"
          onClick={onExecute}
          disabled={isGenerating}
          className="px-5 py-2.5 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-xl shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Sintetizando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Executar Workflow Completo
            </>
          )}
        </button>
      </div>

      {/* Interactive Node Graph */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#0b0c10]"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#232738" />
        <Controls className="!bg-surface !border !border-surface-border !rounded-xl !overflow-hidden fill-white" />
        <MiniMap
          nodeColor="#1e2233"
          maskColor="rgba(11, 12, 16, 0.7)"
          className="!bg-surface !border !border-surface-border !rounded-xl"
        />
      </ReactFlow>
    </div>
  );
};

