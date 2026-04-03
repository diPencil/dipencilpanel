"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type VPS = {
  id: string;
  name: string;
  client?: string;
  domain?: string;
  panel?: string;
  ip: string;
  status: "Active" | "Stopped" | "Suspended" | "Expired";
  plan: string;
  os: string;
  cpu: number;
  ram: number;
  storage: number;
  expiresAt: string;
};

export default function VpsCard({
  vps,
  onDelete,
  onAction,
}: {
  vps: VPS;
  onDelete: () => void;
  onAction: (action: "restart" | "stop" | "start") => void;
}) {
  return (
    <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h4 className="font-semibold">{vps.name}</h4>
          <Badge variant={vps.status === "Active" ? "success" : vps.status === "Stopped" ? "secondary" : "destructive"}>{vps.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{vps.client}{vps.domain ? ` • ${vps.domain}` : ""}{vps.ip ? ` • ${vps.ip}` : ""}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>Plan: <strong>{vps.plan}</strong></div>
          <div>OS: <strong>{vps.os}</strong></div>
          <div>Panel: <strong>{vps.panel || '—'}</strong></div>
          <div>CPU: <strong>{vps.cpu} vCPU</strong></div>
          <div>RAM: <strong>{vps.ram} GB</strong></div>
          <div>Storage: <strong>{vps.storage} GB</strong></div>
          <div>Expires: <strong>{new Date(vps.expiresAt).toLocaleDateString()}</strong></div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          {vps.status !== "Active" ? (
            <Button size="sm" onClick={() => onAction("start")}>
              Start
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={() => onAction("restart")}>
                Restart
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onAction("stop")}>
                Stop
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => alert("Manage view not implemented in mock")}>Manage</Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button>
        </div>
      </div>
    </Card>
  );
}
