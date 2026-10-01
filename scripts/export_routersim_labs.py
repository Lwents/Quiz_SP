"""Export RouterSim .rsm layouts as safe, browser-readable topology data.

Usage: python3 scripts/export_routersim_labs.py RouterSim.zip frontend/public/routersim/labs.json
Only device placement, port IP settings, RIP networks, and cables are exported.
Authentication, banners, users, and other original configuration are discarded.
"""

import argparse
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile


def port_name(kind, model, original):
    original = (original or "").upper()
    if kind == "pc":
        return "Eth0"
    if kind == "netconnect":
        return "N1" if original.startswith("S") else "N0"
    if kind == "router":
        return original if original in {"F0/0", "F0/1", "S0/0", "S0/1"} else None
    try:
        number = int(original.rsplit("/", 1)[-1])
    except ValueError:
        return None
    number = max(1, number)
    if model == "1900" and original.startswith("F"):
        number += 12
    return f"P{number}" if number <= (14 if model == "1900" else 10 if model == "3550" else 12) else None


def parse_lab(data, filename):
    root = ET.fromstring(data)
    if root.tag != "network":
        raise ValueError("Not a RouterSim network")
    devices = []
    ids = {}
    for element in root.findall("devices/*"):
        tag = element.tag.lower()
        if tag not in {"host", "router2600", "switch1900", "switch2950", "switch3550", "netconnect"}:
            continue
        kind = "pc" if tag == "host" else "router" if tag == "router2600" else "netconnect" if tag == "netconnect" else "switch"
        model = "1900" if tag == "switch1900" else "3550" if tag == "switch3550" else "2950"
        original_id = element.attrib.get("id", "")
        original_type = element.attrib.get("type", "")
        device_id = f"{kind}-{original_id}-{len(devices)}"
        point = element.find("point")
        x = max(0, round(float(point.attrib.get("x", 0)) * 1.5)) if point is not None else 0
        y = max(0, round(float(point.attrib.get("y", 0)) * 1.5)) if point is not None else 0
        hostname = next((p.text.strip() for p in element.findall("runningConfig/parms/parm") if p.attrib.get("name") == "HOSTNAME" and p.text), None)
        name = f"Host {original_id}" if kind == "pc" else f"Net Connect {original_id}" if kind == "netconnect" else hostname or f"{original_type} {original_id}"
        count = 14 if model == "1900" else 10 if model == "3550" else 12
        names = ["Eth0"] if kind == "pc" else ["F0/0", "F0/1", "S0/0", "S0/1"] if kind == "router" else ["N0", "N1"] if kind == "netconnect" else [f"P{i}" for i in range(1, count + 1)]
        sources = {}
        for interface in element.findall("runningInterfaces/*"):
            mapped = port_name(kind, model, interface.attrib.get("type"))
            if mapped:
                sources[mapped] = interface
        ports = []
        for port in names:
            source = sources.get(port)
            ip = source.findtext("primaryIpConfig/ipAddress", default="") if source is not None else ""
            mask = source.findtext("primaryIpConfig/subnetMask", default="255.255.255.0") if source is not None else "255.255.255.0"
            rate = source.findtext("clockRate", default="") if source is not None else ""
            entry = {"name": port, "ip": ip or "", "mask": mask or "255.255.255.0", "enabled": source is None or source.attrib.get("shutdown") != "true"}
            if rate and rate.isdigit() and int(rate) > 0:
                entry["clockRate"] = int(rate)
            ports.append(entry)
        gateway = element.findtext("runningInterfaces/ethernet/primaryIpConfig/defaultGateway", default="") if kind == "pc" else ""
        rip_networks = [node.text.strip() for node in element.findall("runningConfig/protocols/rip/networkMap/map") if node.text and node.text.strip()]
        device = {"id": device_id, "kind": kind, "name": name, "x": x, "y": y, "ports": ports, "gateway": gateway or "", "ripNetworks": rip_networks}
        if kind == "switch":
            device["switchModel"] = model
        devices.append(device)
        ids[(original_type, original_id)] = (device_id, kind, model)
    cables = []
    for connection in root.findall("connections/connection"):
        first = connection.find("initiatingDevice")
        second = connection.find("destinationDevice")
        if first is None or second is None:
            continue
        a_info = ids.get((first.attrib.get("type"), first.attrib.get("id")))
        b_info = ids.get((second.attrib.get("type"), second.attrib.get("id")))
        if not a_info or not b_info:
            continue
        a_port = port_name(a_info[1], a_info[2], first.attrib.get("interface"))
        b_port = port_name(b_info[1], b_info[2], second.attrib.get("interface"))
        if not a_port or not b_port:
            continue
        a = {"deviceId": a_info[0], "port": a_port}
        b = {"deviceId": b_info[0], "port": b_port}
        cable = {"id": f"c{len(cables) + 1}", "a": a, "b": b}
        if a_port.startswith("S") or b_port.startswith("S"):
            cable["dce"] = b if connection.findtext("clockSide") == "destination" else a
        cables.append(cable)
    relative = filename.split("/networks/", 1)[-1]
    category = str(Path(relative).parent).replace(".", "General")
    return {"category": category, "name": root.attrib.get("networkName") or Path(relative).stem, "topology": {"devices": devices, "cables": cables}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("zip_file", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    with zipfile.ZipFile(args.zip_file) as archive:
        labs = [parse_lab(archive.read(name), name) for name in archive.namelist() if "/networks/" in name and name.lower().endswith(".rsm")]
    labs.sort(key=lambda lab: (lab["category"], lab["name"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(labs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Exported {len(labs)} sanitized layouts to {args.output}")


if __name__ == "__main__":
    main()
