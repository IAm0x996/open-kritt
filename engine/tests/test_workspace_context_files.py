import json
from types import SimpleNamespace

from open_kritt_engine.workspace import (
    _write_scan_context_files,
    workspace_context_file_references,
    workspace_context_files_prompt,
)


def test_workspace_context_files_keep_large_inputs_out_of_render_context(tmp_path):
    whitepaper = "# Protocol whitepaper\n\n" + "consensus details\n" * 100
    configuration = {"repo_high_row": {"scope": "polygon"}, "repeat_runs": 2}
    files, manifest_path, digest, directory = _write_scan_context_files(
        str(tmp_path),
        {
            "configuration": configuration,
            "extra": {"whitepaper": whitepaper, "ranker_details": {"critical": "loss of funds"}},
        },
    )

    file_map = dict(files)
    assert json.loads((tmp_path / file_map["configuration"]).read_text(encoding="utf-8")) == configuration
    assert (tmp_path / file_map["extra.whitepaper"]).read_text(encoding="utf-8") == whitepaper
    assert json.loads((tmp_path / manifest_path).read_text(encoding="utf-8"))["files"] == [
        {"input": label, "path": path} for label, path in files
    ]
    assert len(digest) == 64
    assert directory == ".open-kritt-context"

    prepared = SimpleNamespace(context_files=files, context_manifest_path=manifest_path)
    referenced = workspace_context_file_references(
        {"configuration": configuration, "extra": {"whitepaper": whitepaper}},
        prepared,
    )
    assert whitepaper not in json.dumps(referenced)
    assert referenced["configuration"] == f"Attached workspace file: {file_map['configuration']}"
    assert referenced["extra"]["whitepaper"] == f"Attached workspace file: {file_map['extra.whitepaper']}"

    prompt = workspace_context_files_prompt(prepared)
    assert manifest_path in prompt
    assert file_map["extra.whitepaper"] in prompt
    assert "only the files and sections relevant" in prompt


def test_workspace_context_files_do_not_overwrite_a_repository_entry(tmp_path):
    occupied = tmp_path / ".open-kritt-context"
    occupied.mkdir()
    marker = occupied / "owned-by-repository.txt"
    marker.write_text("preserve me", encoding="utf-8")

    _files, _manifest_path, _digest, directory = _write_scan_context_files(
        str(tmp_path),
        {"configuration": {}, "extra": {}},
    )

    assert directory == ".open-kritt-context-2"
    assert marker.read_text(encoding="utf-8") == "preserve me"
