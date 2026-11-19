import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AvatarEditor } from "@/components/settings/AvatarEditor";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const resized = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
const resize = vi.fn(async () => resized);
const photo = new File(["x"], "me.jpg", { type: "image/jpeg" });

describe("AvatarEditor", () => {
  it("offers to change the photo and uploads the resized picture", async () => {
    const onUpload = vi.fn(async (_fd: FormData) => undefined);
    render(<AvatarEditor name="Sam" src={null} onUpload={onUpload} onRemove={vi.fn()} resize={resize} />);
    const input = screen.getByLabelText("Change photo") as HTMLInputElement;
    await userEvent.upload(input, photo);
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    expect(resize).toHaveBeenCalledWith(photo);
    expect((onUpload.mock.calls[0][0] as FormData).get("photo")).toBeInstanceOf(Blob);
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the server's reason when a photo is refused", async () => {
    const onUpload = vi.fn(async () => ({ error: "That file isn't a JPG, PNG or WebP photo." }));
    render(<AvatarEditor name="Sam" src={null} onUpload={onUpload} onRemove={vi.fn()} resize={resize} />);
    await userEvent.upload(screen.getByLabelText("Change photo"), photo);
    expect(await screen.findByRole("alert")).toHaveTextContent("That file isn't a JPG, PNG or WebP photo.");
  });

  it("offers removal only when there is a photo", async () => {
    const onRemove = vi.fn(async () => undefined);
    const { rerender } = render(<AvatarEditor name="Sam" src={null} onUpload={vi.fn()} onRemove={onRemove} resize={resize} />);
    expect(screen.queryByRole("button", { name: "Remove photo" })).toBeNull();
    rerender(<AvatarEditor name="Sam" src="/api/avatar?v=1" onUpload={vi.fn()} onRemove={onRemove} resize={resize} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(onRemove).toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "Sam" })).toHaveAttribute("src", "/api/avatar?v=1");
  });
});
