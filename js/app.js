document.addEventListener("DOMContentLoaded", function () {
    const fileSelect = document.getElementById("fileSelect");
    const saveButton = document.getElementById("saveButton");
    const inputFieldsContainer = document.getElementById("inputFieldsContainer");
    const message = document.getElementById("message");

    function toggleDataTableVisibility() {
        const dataTableContainer = document.querySelector(".float-right");
        const tableRows = dataTableContainer.querySelectorAll("#dataTable tbody tr");
        if (tableRows.length > 0) {
            dataTableContainer.style.display = "block";
        } else {
            dataTableContainer.style.display = "none";
        }
    }

    let dataTable = $("#dataTable").DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.5/i18n/fr-FR.json',
        },
    });
    toggleDataTableVisibility();

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
                    th.className = "px-6 py-2 text-white"
                    headerRow.appendChild(th);
                });

                // Dynamically create input fields
                inputFieldsContainer.innerHTML = "";
                data.headers.forEach((header, index) => {
                    const inputContainer = document.createElement("div");
                    inputContainer.className = "mr-3 mb-3"
                    const inputLabel = document.createElement("label");
                    const inputField = document.createElement("input");

                    inputLabel.setAttribute("for", `inputField${index}`);
                    inputLabel.className = "block text-sm font-semibold leading-6 text-[#1b7444] font-semibold";
                    inputField.setAttribute("type", "text");
                    inputLabel.innerHTML = header;
                    inputField.setAttribute("id", `inputField${index}`);
                    inputField.setAttribute("placeholder", header);
                    inputField.className = "rounded-md border-[#1b7444] border text-[#1b7444] px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6";
                    inputContainer.appendChild(inputLabel);
                    inputContainer.appendChild(inputField);
                    inputFieldsContainer.appendChild(inputContainer);

                });
                // Initialize DataTables
                dataTable = $("#dataTable").DataTable({
                    language: {
                        url: '//cdn.datatables.net/plug-ins/1.13.5/i18n/fr-FR.json',
                    },
                    processing: true,
                    serverSide: true,
                    scrollX: true,
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
        toggleDataTableVisibility();

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
        let isFieldsEmpty = false;

        while (true) {
            const inputField = document.getElementById(`inputField${index}`);
            if (!inputField) break;
            inputValues.push(inputField.value);
            if (inputField.value.trim() === "") {
                isFieldsEmpty = true;
                break;
            }
            index++;
        }
        if (isFieldsEmpty) {
            message.innerHTML =
                '<p class="p-2 px-4 bg-red-500 rounded-md text-white">Les champs ne peuvent pas être vides</p>';
            return; // Stop execution if fields are empty
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
                        '<p class="p-2 bg-[#12512f] text-white rounded">Enregistré avec succès</p>';
                } else {
                    message.innerHTML =
                        '<p class="p-2 bg-red-500 text-white rounded">Erreur lors de l\'enregistrement des données</p>';
                }
            });
    });
});
