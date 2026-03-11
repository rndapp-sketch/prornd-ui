async function test() {
    try {
        const res = await fetch('http://172.16.134.81:8000/api/method/frappe.desk.form.load.getdoctype?doctype=Direct Purchase');
        const data = await res.json();
        const fields = data.docs[0].fields;
        const teqdField = fields.find(f => f.fieldname === 'table_teqd');
        console.log("table_teqd reqd:", teqdField.reqd);
        console.log("table_teqd depends_on:", teqdField.depends_on);
        console.log("table_teqd mandatory_depends_on:", teqdField.mandatory_depends_on);
    } catch (e) { console.error(e); }
}
test();
