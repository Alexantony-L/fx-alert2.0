import { removeAlert } from "@/lib/alert-store";

/**
 * DELETE /api/alerts/[id] — manually remove an alert.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const removed = removeAlert(id);
  if (!removed) {
    return Response.json({ error: "Alert not found" }, { status: 404 });
  }

  return Response.json({ message: "Alert removed", id });
}
