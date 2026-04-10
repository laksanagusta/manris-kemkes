const fs = require('fs');

const path = 'frontend/src/app/(app)/risk/working-papers/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('FormPage')) {
  content = content.replace(
    'import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";',
    'import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";\nimport { FormPage, FormHeader, FormSection } from "@/components/shared/form-shell";'
  );
}

const startMarker = `  return (\n    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">`;
const startIndex = content.indexOf(startMarker);

if (startIndex === -1) {
  console.log("Could not find start marker");
  process.exit(1);
}

// Find the last `  );` before the final `}`
const lastReturnEnd = content.lastIndexOf('  );\n}');

const newReturn = `  return (
    <FormPage className="max-w-7xl">
      <FormHeader
        title={data.title}
        description={data.description}
        backLabel="Kembali ke Kertas Kerja"
        onBack={() => router.back()}
        badges={
          <>
            <Badge className={cn("capitalize px-2 py-0.5", statusVariant[status])}>
              {statusLabel[status]}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs font-mono bg-muted/30 px-2 py-1 rounded border border-border/50">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{new Date(data.created_at).toLocaleDateString('id-ID', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}</span>
            </div>
            {data.assessment_cycle && (
              <div className="flex items-center gap-1.5 text-xs font-mono bg-muted/30 px-2 py-1 rounded border border-border/50">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Siklus: {data.assessment_cycle}</span>
              </div>
            )}
            {data.document_hash && (
              <div className="flex items-center gap-2 text-xs font-mono bg-muted/30 px-2 py-1 rounded border border-border/50">
                <span className="text-muted-foreground">Hash:</span>
                <span>{data.document_hash.substring(0, 16)}...</span>
                <button 
                  onClick={() => copyHash(data.document_hash!)}
                  className="hover:text-primary transition-colors p-1"
                  title="Salin Hash Dokumen"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </>
        }
        actions={
          <>
            {canDelete && (
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" size="sm" className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700" onClick={() => setCancelDialogOpen(true)}>
                <XCircle className="w-4 h-4 mr-2" />
                Batalkan
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Ekspor Excel
            </Button>
          </>
        }
      />

      {status === 'cancelled' && data.cancelled_at && (
        <div className="bg-destructive/10 text-destructive text-sm px-6 py-3 rounded-[24px] border border-destructive/20 flex items-center gap-2 font-medium">
          <XCircle className="w-4 h-4" />
          Kertas Kerja ini telah dibatalkan pada {new Date(data.cancelled_at).toLocaleString('id-ID')}
        </div>
      )}
      {status === 'completed' && (
        <div className="bg-success/10 text-success-foreground text-sm px-6 py-3 rounded-[24px] border border-success/20 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-success" />
          Kertas Kerja telah selesai ditandatangani oleh semua pihak.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FormSection
            title="Risiko dalam Kertas Kerja"
            action={<Badge variant="secondary" className="font-mono">{data.risk_snapshots.length} Risiko</Badge>}
            contentClassName="p-0 sm:p-0"
          >
            <div className="overflow-x-auto rounded-b-[24px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="w-24 text-xs">Kode</TableHead>
                    <TableHead className="text-xs">Judul Risiko</TableHead>
                    <TableHead className="text-xs">Kategori</TableHead>
                    <TableHead className="text-xs text-center">P</TableHead>
                    <TableHead className="text-xs text-center">D</TableHead>
                    <TableHead className="text-xs text-center">Nilai</TableHead>
                    <TableHead className="text-xs w-28">Tingkat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.risk_snapshots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Tidak ada data risiko.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.risk_snapshots.map((risk, index) => {
                      const levelLabel = risk.tingkat_risiko || "Rendah";
                      const badgeCls = levelBadgeVariant[levelLabel] || levelBadgeVariant["Rendah"];
                      
                      return (
                        <TableRow 
                          key={index} 
                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => router.push('/risk/register/new?id=' + risk.original_risk_id)}
                        >
                          <TableCell className="text-center text-xs text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{risk.code || "-"}</TableCell>
                          <TableCell className="text-xs font-medium max-w-[200px] truncate" title={risk.title}>
                            {risk.title}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[120px] capitalize">
                            {risk.category ? risk.category.replace(/_/g, ' ') : '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs">{risk.probability || '-'}</TableCell>
                          <TableCell className="text-center text-xs">{risk.impact || '-'}</TableCell>
                          <TableCell className="text-center text-xs font-semibold">{risk.nilai || '-'}</TableCell>
                          <TableCell>
                            <Badge className={cn("text-[10px] font-semibold border px-1.5 h-5", badgeCls)}>
                              {levelLabel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </FormSection>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <FormSection
            title="Status Tanda Tangan"
            className="sticky top-6"
          >
            {status === 'draft' && current_signatory_sequence === 0 && (
              <div className="text-sm text-muted-foreground mb-6 text-center italic bg-muted/30 p-3 rounded-lg border border-border/50">
                Belum ada tanda tangan. Dokumen ini masih berupa draft.
              </div>
            )}

            <div className="space-y-6 relative ml-2">
              {signatories.map((sig, index) => {
                const isSigned = sig.status === 'signed';
                const isCurrent = !isSigned && sig.sequence_no === current_signatory_sequence + 1;
                const isFuture = !isSigned && !isCurrent;
                
                const isLast = index === signatories.length - 1;

                return (
                  <div key={sig.id} className={cn(
                    "flex gap-4 relative",
                    isFuture && "opacity-60"
                  )}>
                    {!isLast && (
                      <div className={cn(
                        "absolute top-8 left-[11px] bottom-[-24px] w-0.5 z-0",
                        isSigned ? "bg-success" : "bg-border"
                      )} />
                    )}
                    <div className="relative z-10 flex-shrink-0 mt-1">
                      {isSigned ? (
                        <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center border border-success/30">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border">
                          <Circle className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold truncate leading-none">
                            {sig.signer_name}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                            {sig.signer_title}
                          </p>
                          {sig.signer_role_label && (
                            <Badge variant="outline" className="mt-1 text-[10px] px-1.5 h-4 leading-none bg-muted/30">
                              {sig.signer_role_label}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {isSigned && sig.signed_at && (
                        <div className="mt-2 flex flex-col gap-2">
                          <div className="inline-flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-1 rounded w-fit border border-success/20 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ditandatangani: {new Date(sig.signed_at).toLocaleString('id-ID')}
                          </div>
                        </div>
                      )}
                      {isCurrent && canSign && (
                        <Button 
                          size="sm" 
                          className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                          onClick={() => setSignDialogOpen(true)}
                        >
                          <FileSignature className="w-4 h-4 mr-2" />
                          Tanda Tangani Sekarang
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </FormSection>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tanda Tangani Kertas Kerja</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menandatangani dokumen ini? Tindakan ini akan menyimpan data Anda sebagai penandatangan sah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSign}>Tanda Tangani</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Kertas Kerja</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan Kertas Kerja ini? Dokumen yang dibatalkan tidak dapat ditandatangani lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleCancel} className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600">
              Batalkan Dokumen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kertas Kerja</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus Kertas Kerja ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormPage>
  );`;

content = content.substring(0, startIndex) + newReturn + '\n}';
fs.writeFileSync(path, content);
console.log('done');
