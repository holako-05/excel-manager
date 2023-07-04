document.addEventListener("DOMContentLoaded", function () {
    const fileSelect = document.getElementById("fileSelect");
    const saveButton = document.getElementById("saveButton");
    const inputFieldsContainer = document.getElementById("inputFieldsContainer");
    const message = document.getElementById("message");

    let dataTable = $("#dataTable").DataTable();

    fileSelect.addEventListener("change", function () {
        const selectedFile = fileSelect.options[fileSelect.selectedIndex].value;

        fetch(`php/handler.php?action=fetch&file=${selectedFile}`)
            .then((response) => response.json())
            .then((data) => {
                if (!data || !data.headers || !data.data) {
                    console.error("Unexpected data structure:", data);
                    return;
                }

                dataTable.clear();
                dataTable.destroy();

                // Dynamically create headers
                const thead = document.querySelector("#dataTable thead");
                thead.innerHTML = "";
                const headerRow = thead.insertRow();
                data.headers.forEach((header) => {
                    const th = document.createElement("th");
                    th.textContent = header;
                    th.className = "px-6 py-2 text-gray-500"
                    headerRow.appendChild(th);
                });

                // Dynamically create input fields
                inputFieldsContainer.innerHTML = "";
                data.headers.forEach((header, index) => {
                    const inputContainer = document.createElement("div");
                    inputContainer.className="relative mb-3 "
                    inputContainer.setAttribute("data-te-input-wrapper-init","")
                    const inputLabel = document.createElement("label");
                    const inputField = document.createElement("input");

                    inputLabel.setAttribute("for", `inputField${index}`);
                    inputLabel.className = "pointer-events-none absolute left-3 top-0 mb-0 max-w-[90%] origin-[0_0] truncate pt-[0.37rem] leading-[1.6] text-neutral-500 transition-all duration-200 ease-out peer-focus:-translate-y-[0.9rem] peer-focus:scale-[0.8] peer-focus:text-primary peer-data-[te-input-state-active]:-translate-y-[0.9rem] peer-data-[te-input-state-active]:scale-[0.8] motion-reduce:transition-none dark:text-neutral-200 dark:peer-focus:text-primary";
                    inputField.setAttribute("type", "text");
                    inputLabel.innerHTML = header;
                    inputField.setAttribute("id", `inputField${index}`);
                    inputField.setAttribute("placeholder", header);
                    inputField.className = "peer block min-h-[auto] w-full rounded border-0 bg-transparent px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear focus:placeholder:opacity-100 peer-focus:text-primary data-[te-input-state-active]:placeholder:opacity-100 motion-reduce:transition-none dark:text-neutral-200 dark:placeholder:text-neutral-200 dark:peer-focus:text-primary [&:not([data-te-input-placeholder-active])]:placeholder:opacity-0";
                    inputContainer.appendChild(inputField);
                    inputContainer.appendChild(inputLabel);
                    inputFieldsContainer.appendChild(inputContainer);
                    // inputFieldsContainer.appendChild(inputLabel);

                });

                // Initialize DataTables
                dataTable = $("#dataTable").DataTable({
                    processing: true,
                    serverSide: true,
                    ajax: {
                        url: "php/handler.php",
                        type: "GET",
                        data: {
                            action: "fetch",
                            file: selectedFile
                        },
                        dataSrc: function (json) {
                            return json.data;
                        },
                    },
                    columns: data.headers.map(header => ({title: header, searchable: true, orderable: true})),

                });
            })
            .catch((error) => {
                console.error("Error fetching file data:", error);
            });
    });

    function addRowToTable(rowData) {
        dataTable.row.add(rowData).draw();
    }

    // Fetch available files and populate the dropdown
    fetch("php/handler.php?action=files")
        .then((response) => response.json())
        .then((files) => {
            files.forEach((file) => {
                const option = document.createElement("option");
                option.value = file.path;
                option.textContent =
                    typeof file === "string" ? file.split("/").pop() : file.name;
                fileSelect.appendChild(option);
            });
        });

    // Handle save button click
    saveButton.addEventListener("click", function () {
        const selectedFile = fileSelect.value;

        // Collect input values dynamically
        const inputValues = [];
        let index = 0;
        while (true) {
            const inputField = document.getElementById(`inputField${index}`);
            if (!inputField) break;
            inputValues.push(inputField.value);
            index++;
        }

        fetch("php/handler.php?action=save", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({file: selectedFile, data: inputValues}),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.status === "success") {
                    inputValues.forEach((value, index) => {
                        document.getElementById(`inputField${index}`).value = "";
                    });
                    addRowToTable(inputValues);
                    message.innerHTML =
                        '<p class="p-2 bg-green-500 text-white">Saved successfully</p>';
                } else {
                    message.innerHTML =
                        '<p class="p-2 bg-red-500 text-white">Error saving data</p>';
                }
            });
    });
});
